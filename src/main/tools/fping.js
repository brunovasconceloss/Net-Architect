'use strict';

const { spawn } = require('child_process');

const IS_WIN = process.platform === 'win32';
const CONCURRENCY = 25;

/**
 * Bulk ping a CIDR range using the OS ping command for real ICMP probing.
 * @param {string} cidr - e.g. "192.168.1.0/24"
 * @param {Function} onProgress - called with { ip, alive, rtt, progress, total, completed }
 * @param {Function} onResult - called with { cidr, total, alive, results[] }
 * @returns {{ cancel: Function }}
 */
function runFping(cidr, onProgress, onResult) {
  const hosts = expandCIDR(cidr);
  const results = [];
  let cancelled = false;
  let completed = 0;

  function probeHost(ip) {
    return new Promise((resolve) => {
      if (cancelled) return resolve({ ip, alive: false, rtt: null });

      const start = Date.now();
      const args = IS_WIN
        ? ['-n', '1', '-w', '500', ip]
        : ['-c', '1', '-W', '1', ip];

      const proc = spawn('ping', args, { stdio: ['ignore', 'pipe', 'ignore'] });
      let stdout = '';

      proc.stdout.on('data', d => { stdout += d.toString(); });

      proc.on('close', (code) => {
        const alive = code === 0;
        const rtt = alive ? (parseRTT(stdout) ?? (Date.now() - start)) : null;
        resolve({ ip, alive, rtt });
      });

      proc.on('error', () => resolve({ ip, alive: false, rtt: null }));
    });
  }

  async function run() {
    const queue = [...hosts];
    const workers = Array.from({ length: Math.min(CONCURRENCY, hosts.length) }, async () => {
      while (queue.length > 0 && !cancelled) {
        const ip = queue.shift();
        const res = await probeHost(ip);
        results.push(res);
        completed++;
        onProgress({
          ...res,
          progress: Math.round((completed / hosts.length) * 100),
          total: hosts.length,
          completed,
        });
      }
    });

    await Promise.all(workers);

    const alive = results.filter(r => r.alive).length;
    onResult({ cidr, total: hosts.length, alive, results });
  }

  run();

  return {
    cancel: () => { cancelled = true; },
  };
}

/**
 * Parse RTT from ping output.
 * Windows: "time=12ms" or "Average = 12ms"
 * Linux/Mac: "time=1.23 ms"
 */
function parseRTT(stdout) {
  // Windows: "time=12ms" in reply line
  const m1 = stdout.match(/time[<=](\d+)ms/i);
  if (m1) return parseInt(m1[1]);
  // Windows: "Average = 12ms"
  const m2 = stdout.match(/Average\s*=\s*(\d+)ms/i);
  if (m2) return parseInt(m2[1]);
  // Linux/Mac: "time=1.23 ms"
  const m3 = stdout.match(/time[<=]([\d.]+)\s*ms/i);
  if (m3) return Math.round(parseFloat(m3[1]));
  return null;
}

/**
 * Expand a CIDR block into an array of host IP strings.
 * Skips network and broadcast addresses. Max 1024 hosts.
 */
function expandCIDR(cidr) {
  const [base, prefix] = cidr.split('/');
  const pfx = parseInt(prefix, 10);

  const baseNum = ipToLong(base);
  const mask = pfx === 0 ? 0 : (~0 << (32 - pfx)) >>> 0;
  const network = (baseNum & mask) >>> 0;
  const total = Math.pow(2, 32 - pfx);

  const hosts = [];
  const limit = Math.min(total, 1024);

  for (let i = 0; i < limit; i++) {
    const ip = (network + i) >>> 0;
    if (pfx <= 30 && (i === 0 || i === total - 1)) continue;
    hosts.push(longToIP(ip));
  }

  return hosts;
}

function ipToLong(ip) {
  return ip.split('.').reduce((acc, oct) => (acc * 256 + parseInt(oct, 10)) >>> 0, 0);
}

function longToIP(n) {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join('.');
}

module.exports = { runFping, expandCIDR };
