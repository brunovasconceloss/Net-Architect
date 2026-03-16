'use strict';

const { spawn } = require('child_process');

/**
 * Run a ping command and stream results.
 * @param {string} host - sanitized hostname/IP
 * @param {number} count - number of pings (1-100)
 * @param {Function} onData - called with each line
 * @param {Function} onResult - called with final { host, sent, received, loss, rtts }
 * @returns {{ kill: Function }}
 */
function runPing(host, count, onData, onResult) {
  const safeCount = Math.max(1, Math.min(100, Math.floor(count)));
  const isWin = process.platform === 'win32';

  const args = isWin
    ? ['-n', String(safeCount), host]
    : ['-c', String(safeCount), host];

  const proc = spawn(isWin ? 'ping' : 'ping', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const lines = [];

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    chunk.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push(trimmed);
        onData({ line: trimmed, timestamp: Date.now() });
      }
    });
  });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    onData({ line: chunk.trim(), error: true, timestamp: Date.now() });
  });

  proc.on('close', (code) => {
    const result = parsePingOutput(lines, host, safeCount, isWin);
    result.exitCode = code;
    onResult(result);
  });

  return { kill: () => proc.kill() };
}

function parsePingOutput(lines, host, count, isWin) {
  const result = { host, sent: count, received: 0, loss: 100, rtts: [], min: null, max: null, avg: null };

  for (const line of lines) {
    if (isWin) {
      // Windows: "Reply from 8.8.8.8: bytes=32 time=14ms TTL=117"
      const replyMatch = line.match(/time[=<](\d+)ms/i);
      if (replyMatch) result.rtts.push(Number(replyMatch[1]));

      // "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
      const statsMatch = line.match(/Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+)/i);
      if (statsMatch) {
        result.sent = Number(statsMatch[1]);
        result.received = Number(statsMatch[2]);
      }
    } else {
      // Linux/macOS: "64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=14.3 ms"
      const replyMatch = line.match(/time=(\d+\.?\d*)\s*ms/);
      if (replyMatch) result.rtts.push(parseFloat(replyMatch[1]));

      // "4 packets transmitted, 4 received, 0% packet loss"
      const statsMatch = line.match(/(\d+) packets transmitted,\s*(\d+) received/);
      if (statsMatch) {
        result.sent = Number(statsMatch[1]);
        result.received = Number(statsMatch[2]);
      }

      // "rtt min/avg/max/mdev = 13.9/14.2/14.5/0.2 ms"
      const rttMatch = line.match(/min\/avg\/max.*?=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
      if (rttMatch) {
        result.min = parseFloat(rttMatch[1]);
        result.avg = parseFloat(rttMatch[2]);
        result.max = parseFloat(rttMatch[3]);
      }
    }
  }

  if (result.sent > 0) {
    result.loss = Math.round(((result.sent - result.received) / result.sent) * 100);
  }

  if (result.rtts.length > 0 && result.min === null) {
    result.min = Math.min(...result.rtts);
    result.max = Math.max(...result.rtts);
    result.avg = parseFloat((result.rtts.reduce((a, b) => a + b, 0) / result.rtts.length).toFixed(2));
  }

  return result;
}

module.exports = { runPing };
