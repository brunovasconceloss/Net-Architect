'use strict';

const net = require('net');

/**
 * Perform a TCP connect timing test (TCP Ping).
 * @param {string} host - sanitized hostname/IP
 * @param {number} port - sanitized port
 * @param {number} [count=4] - number of probes
 * @param {Function} onResult - called with { host, port, probes[], avg, min, max }
 */
function runTCPPing(host, port, count, onResult) {
  const TIMEOUT = 5000;
  const safeCount = Math.max(1, Math.min(20, Math.floor(count || 4)));
  const probes = [];

  function probe(i) {
    return new Promise((resolve) => {
      const start = Date.now();
      const sock = new net.Socket();
      let done = false;

      const finish = (result) => {
        if (done) return;
        done = true;
        sock.destroy();
        resolve(result);
      };

      sock.setTimeout(TIMEOUT);
      sock.connect(port, host);

      sock.on('connect', () => {
        const rtt = Date.now() - start;
        finish({ seq: i, success: true, rtt, message: `Connected to ${host}:${port} — ${rtt}ms` });
      });

      sock.on('timeout', () => {
        finish({ seq: i, success: false, rtt: null, message: `Timeout connecting to ${host}:${port}` });
      });

      sock.on('error', (err) => {
        const rtt = Date.now() - start;
        if (err.code === 'ECONNREFUSED') {
          // Port closed but host responded — still a valid RTT
          finish({ seq: i, success: false, rtt, message: `Connection refused (${host}:${port}) — ${rtt}ms` });
        } else {
          finish({ seq: i, success: false, rtt: null, message: `Error: ${err.message}` });
        }
      });
    });
  }

  async function run() {
    for (let i = 0; i < safeCount; i++) {
      const result = await probe(i + 1);
      probes.push(result);
      // Small delay between probes
      if (i < safeCount - 1) await sleep(500);
    }

    const rtts = probes.filter(p => p.rtt !== null).map(p => p.rtt);
    onResult({
      host,
      port,
      probes,
      min: rtts.length ? Math.min(...rtts) : null,
      max: rtts.length ? Math.max(...rtts) : null,
      avg: rtts.length ? parseFloat((rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(2)) : null,
      successCount: probes.filter(p => p.success).length,
      total: safeCount,
    });
  }

  run();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { runTCPPing };
