'use strict';

const net = require('net');

/**
 * Bulk ping a CIDR range using concurrent TCP probes (port 7 or ICMP fallback via ping).
 * Uses Node.js net.Socket for platform-independent "reachability" testing.
 * @param {string} cidr - e.g. "192.168.1.0/24"
 * @param {Function} onProgress - called with { ip, alive, rtt }
 * @param {Function} onResult - called with { cidr, total, alive, results[] }
 * @returns {{ cancel: Function }}
 */
function runFping(cidr, onProgress, onResult) {
  const hosts = expandCIDR(cidr);
  const results = [];
  let cancelled = false;
  let completed = 0;
  const CONCURRENCY = 50;
  const TIMEOUT = 1500;

  function probeHost(ip) {
    return new Promise((resolve) => {
      if (cancelled) return resolve({ ip, alive: false, rtt: null });

      const start = Date.now();
      const sock = new net.Socket();
      let done = false;

      const finish = (alive) => {
        if (done) return;
        done = true;
        sock.destroy();
        const rtt = alive ? Date.now() - start : null;
        resolve({ ip, alive, rtt });
      };

      // Try port 80 (most likely open), fallback signal = host responded in any way
      sock.setTimeout(TIMEOUT);
      sock.connect(80, ip);
      sock.on('connect', () => finish(true));
      sock.on('timeout', () => finish(false));
      sock.on('error', (err) => {
        // Connection refused means host is up
        if (err.code === 'ECONNREFUSED') finish(true);
        else finish(false);
      });
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
 * Expand a CIDR block into an array of host IP strings.
 * Skips network and broadcast addresses for /24 and smaller.
 * Max 1024 hosts to prevent abuse.
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
    // Skip network (i=0) and broadcast (i=total-1) for prefix <= 30
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
