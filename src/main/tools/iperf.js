'use strict';

const { spawn } = require('child_process');

let activeProc = null;

/**
 * Start an iPerf3 client test.
 * @param {string} host - sanitized server IP/hostname
 * @param {number} port - sanitized port
 * @param {number} duration - test duration in seconds (1-300)
 * @param {Function} onData - called with each output line
 * @param {Function} onResult - called with parsed JSON result
 */
function startClient(host, port, duration, onData, onResult) {
  if (activeProc) throw new Error('An iPerf3 session is already active');

  const safeDuration = Math.max(1, Math.min(300, Math.floor(duration)));

  const args = [
    '-c', host,
    '-p', String(port),
    '-t', String(safeDuration),
    '-J',
    '--forceflush',
  ];

  activeProc = spawn('iperf3', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  collectIperfOutput(onData, onResult);
}

/**
 * Start an iPerf3 server.
 * @param {number} port
 * @param {Function} onData
 * @param {Function} onResult
 */
function startServer(port, onData, onResult) {
  if (activeProc) throw new Error('An iPerf3 session is already active');

  const args = ['-s', '-p', String(port), '-J', '--one-off'];
  activeProc = spawn('iperf3', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  collectIperfOutput(onData, onResult);
}

function collectIperfOutput(onData, onResult) {
  const chunks = [];
  let finished = false;

  const finish = (result) => {
    if (finished) return;
    finished = true;
    activeProc = null;
    onResult(result);
  };

  activeProc.on('error', (err) => {
    const msg = err.code === 'ENOENT'
      ? 'iperf3 not found. Install iperf3 and ensure it is in your PATH.'
      : `iPerf3 error: ${err.message}`;
    onData({ line: msg, error: true, timestamp: Date.now() });
    finish({ success: false, error: msg });
  });

  activeProc.stdout.setEncoding('utf8');
  activeProc.stdout.on('data', (chunk) => {
    chunks.push(chunk);
    chunk.split('\n').forEach(line => {
      if (line.trim()) onData({ line: line.trim(), timestamp: Date.now() });
    });
  });

  activeProc.stderr.setEncoding('utf8');
  activeProc.stderr.on('data', (chunk) => {
    onData({ line: chunk.trim(), error: true, timestamp: Date.now() });
  });

  activeProc.on('close', () => {
    const raw = chunks.join('');
    try {
      const parsed = JSON.parse(raw);
      finish({ success: true, data: summarizeIperf(parsed), raw: parsed });
    } catch {
      finish({ success: false, raw, error: 'Failed to parse iPerf3 output' });
    }
  });
}

/**
 * Stop the active iPerf3 process.
 */
function stopIperf() {
  if (activeProc) {
    activeProc.kill();
    activeProc = null;
  }
}

function summarizeIperf(json) {
  const end = json.end || {};
  const sum = end.sum_sent || end.sum || {};
  const recv = end.sum_received || {};

  return {
    protocol: json.start?.test_start?.protocol || 'TCP',
    host: json.start?.connecting_to?.host || '',
    port: json.start?.connecting_to?.port || 0,
    duration: json.start?.test_start?.duration || 0,
    bytesSent: sum.bytes || 0,
    bitsPerSecSent: sum.bits_per_second || 0,
    bytesReceived: recv.bytes || 0,
    bitsPerSecReceived: recv.bits_per_second || 0,
    retransmits: sum.retransmits || 0,
  };
}

module.exports = { startClient, startServer, stopIperf };
