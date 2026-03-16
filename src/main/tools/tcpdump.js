'use strict';

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

let activeProc = null;
let pcapPath = null;

/**
 * Start a packet capture session.
 * Uses tcpdump on Linux/macOS, WinDump or built-in on Windows.
 * @param {string} iface - sanitized interface name
 * @param {string} filter - sanitized BPF filter expression
 * @param {Function} onData - called with each captured packet summary line
 * @returns {{ pcapPath: string }}
 */
function startCapture(iface, filter, onData) {
  if (activeProc) throw new Error('A capture session is already active');

  const isWin = process.platform === 'win32';
  const ts = Date.now();
  const outputDir = path.join(os.tmpdir(), 'net-architect');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  pcapPath = path.join(outputDir, `capture_${ts}.pcap`);

  const cmd = isWin ? 'WinDump' : 'tcpdump';
  const args = [
    '-i', iface,
    '-w', pcapPath,
    '-l',      // line-buffered stdout
    '--print', // also print summaries (tcpdump ≥4.99)
  ];

  if (filter) args.push(...filter.split(' '));

  // Fallback for older tcpdump without --print: write pcap, also print to stdout
  const argsNoprint = ['-i', iface, '-w', pcapPath, '-l'];
  if (filter) argsNoprint.push(...filter.split(' '));

  try {
    activeProc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    // Try without --print
    activeProc = spawn(cmd, argsNoprint, { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  activeProc.stdout.setEncoding('utf8');
  activeProc.stdout.on('data', (chunk) => {
    chunk.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) onData({ line: trimmed, timestamp: Date.now() });
    });
  });

  activeProc.stderr.setEncoding('utf8');
  activeProc.stderr.on('data', (chunk) => {
    onData({ line: chunk.trim(), error: true, timestamp: Date.now() });
  });

  return { pcapPath };
}

/**
 * Stop the active capture session.
 * @returns {{ pcapPath: string }}
 */
function stopCapture() {
  if (!activeProc) throw new Error('No active capture session');
  activeProc.kill('SIGINT');
  activeProc = null;
  const p = pcapPath;
  pcapPath = null;
  return { pcapPath: p };
}

/**
 * List available network interfaces.
 * @returns {Promise<string[]>}
 */
function listInterfaces() {
  return new Promise((resolve) => {
    const interfaces = Object.keys(require('os').networkInterfaces());
    resolve(interfaces);
  });
}

module.exports = { startCapture, stopCapture, listInterfaces };
