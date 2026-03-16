'use strict';

const { spawn } = require('child_process');

/**
 * Run a traceroute command and stream hop data.
 * @param {string} host - sanitized hostname/IP
 * @param {Function} onData - called with each parsed hop line
 * @param {Function} onResult - called with final { host, hops[] }
 * @returns {{ kill: Function }}
 */
function runTraceroute(host, onData, onResult) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'tracert' : 'traceroute';
  const args = isWin ? ['-d', '-h', '30', host] : ['-m', '30', '-n', host];

  const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const hops = [];
  let hopCounter = 0;

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    chunk.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const hop = isWin ? parseWindowsHop(trimmed) : parseUnixHop(trimmed);
      if (hop) {
        hopCounter++;
        hop.hop = hopCounter;
        hops.push(hop);
        onData({ hop, line: trimmed, timestamp: Date.now() });
      } else {
        onData({ line: trimmed, timestamp: Date.now() });
      }
    });
  });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    onData({ line: chunk.trim(), error: true, timestamp: Date.now() });
  });

  proc.on('close', (code) => {
    onResult({ host, hops, exitCode: code });
  });

  return { kill: () => proc.kill() };
}

// Windows: "  1    14 ms    13 ms    14 ms  8.8.8.8"
function parseWindowsHop(line) {
  const m = line.match(/^\s*(\d+)\s+([\d<*]+\s*ms|[*])\s+([\d<*]+\s*ms|[*])\s+([\d<*]+\s*ms|[*])\s+(.+)$/i);
  if (!m) return null;
  const rtts = [m[2], m[3], m[4]].map(r => {
    const n = parseInt(r);
    return isNaN(n) ? null : n;
  });
  return {
    address: m[5].trim(),
    rtts,
    avg: rtts.filter(Boolean).length > 0
      ? parseFloat((rtts.filter(Boolean).reduce((a, b) => a + b, 0) / rtts.filter(Boolean).length).toFixed(2))
      : null,
  };
}

// Linux/macOS: " 1  8.8.8.1  1.234 ms  1.456 ms  1.789 ms"
function parseUnixHop(line) {
  const m = line.match(/^\s*(\d+)\s+([\d.]+|\*)\s*(.*)/);
  if (!m) return null;
  const address = m[2] === '*' ? '*' : m[2];
  const rttMatches = line.match(/[\d.]+\s*ms/g) || [];
  const rtts = rttMatches.map(r => parseFloat(r));
  return {
    address,
    rtts,
    avg: rtts.length > 0
      ? parseFloat((rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(2))
      : null,
  };
}

module.exports = { runTraceroute };
