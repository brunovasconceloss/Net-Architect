'use strict';

const { spawn } = require('child_process');

/**
 * MTR-style route analysis: traceroute + per-hop ping statistics.
 *
 * Phase 1 — traceroute discovers hops.
 * Phase 2 — each hop is pinged N times in parallel; stats stream live.
 *
 * Language-agnostic for all Windows locales (EN/PT/FR/ES):
 *   - Replies  detected by "TTL=" (universal)
 *   - RTT      extracted by /[<=](\d+)\s*ms/ (works for time=, tempo=, etc.)
 *   - Loss     computed accurately at process close: (N - recv) / N × 100
 *
 * @param {string}   host     - sanitized hostname/IP
 * @param {number}   packets  - pings per hop (10–200, default 50)
 * @param {Function} onData   - streaming updates
 * @param {Function} onResult - final callback
 * @returns {{ kill: Function }}
 */
function runMTR(host, packets, onData, onResult) {
  const isWin = process.platform === 'win32';
  const numPackets = Math.max(10, Math.min(200, parseInt(packets) || 50));

  let killed = false;
  const procs = [];

  function killAll() {
    killed = true;
    procs.forEach(p => { try { p.kill(); } catch (_) {} });
  }

  // ── Phase 1: Discover hops ─────────────────────────────────────────
  onData({ phase: 'discovery', message: `Tracing route to ${host}...` });

  const trCmd  = isWin ? 'tracert' : 'traceroute';
  const trArgs = isWin ? ['-d', '-h', '30', host] : ['-m', '30', '-n', host];
  const trProc = spawn(trCmd, trArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  procs.push(trProc);

  const orderedHops = [];
  let hopCounter = 0;
  let trBuf = '';

  trProc.stdout.setEncoding('utf8');
  trProc.stdout.on('data', chunk => {
    trBuf += chunk;
    const lines = trBuf.split('\n');
    trBuf = lines.pop();
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const ip = isWin ? extractWindowsHopIP(line) : extractUnixHopIP(line);
      if (ip !== undefined) {
        hopCounter++;
        orderedHops.push({ hop: hopCounter, ip });
        onData({ phase: 'discovery', hop: hopCounter, address: ip });
      }
    }
  });

  trProc.stderr.setEncoding('utf8');
  trProc.stderr.on('data', () => {});

  trProc.on('close', () => {
    if (killed) return;

    if (orderedHops.length === 0) {
      onResult({ host, hops: [], exitCode: 1, error: 'No route discovered' });
      return;
    }

    const validHops = orderedHops.filter(h => h.ip !== '*');

    if (validHops.length === 0) {
      onResult({
        host,
        hops: orderedHops.map(({ hop }) => makeTimeoutHop(hop)),
        exitCode: 0,
      });
      return;
    }

    // ── Phase 2: Ping each hop in parallel ────────────────────────
    onData({ phase: 'pinging', total: validHops.length, packets: numPackets });

    const hopStats = {};
    for (const { hop, ip } of orderedHops) {
      if (ip !== '*') {
        hopStats[ip] = {
          hop, address: ip,
          sent: 0, recv: 0, loss: 0,
          last: null, avg: null, best: null, worst: null,
          _rtts: [],
        };
      }
    }

    let doneCount = 0;

    for (const { ip } of validHops) {
      const pingArgs = isWin
        ? ['-n', String(numPackets), '-w', '1000', ip]
        : ['-c', String(numPackets), '-W', '1', ip];

      const pingProc = spawn('ping', pingArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      procs.push(pingProc);

      const s = hopStats[ip];
      let pBuf = '';

      pingProc.stdout.setEncoding('utf8');
      pingProc.stdout.on('data', chunk => {
        pBuf += chunk;
        const lines = pBuf.split('\n');
        pBuf = lines.pop();

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;

          if (isWin) {
            // On Windows, every successful ping reply contains "TTL=" — universal across all locales.
            // (EN: "Reply from ... TTL=..." / PT: "Resposta de ... TTL=...")
            if (/\bTTL=/i.test(line)) {
              const rtt = extractWindowsRTT(line);
              s.recv++;
              s.sent = s.recv; // live estimate; corrected to numPackets at close
              s.last = rtt;
              s._rtts.push(rtt);
              s.best  = s.best  === null ? rtt : Math.min(s.best,  rtt);
              s.worst = s.worst === null ? rtt : Math.max(s.worst, rtt);
              s.avg   = +(s._rtts.reduce((a, b) => a + b, 0) / s._rtts.length).toFixed(2);
              s.loss  = 0; // accurate loss shown at close
              onData({ phase: 'stats', hop: s.hop, address: s.address,
                sent: s.sent, recv: s.recv, loss: s.loss,
                last: s.last, avg: s.avg, best: s.best, worst: s.worst });
            }
          } else {
            // Unix: "64 bytes from X: ... time=14.3 ms"
            const rtt = extractUnixRTT(line);
            if (rtt !== null) {
              s.recv++;
              s.sent = s.recv;
              s.last = rtt;
              s._rtts.push(rtt);
              s.best  = s.best  === null ? rtt : Math.min(s.best,  rtt);
              s.worst = s.worst === null ? rtt : Math.max(s.worst, rtt);
              s.avg   = +(s._rtts.reduce((a, b) => a + b, 0) / s._rtts.length).toFixed(2);
              s.loss  = 0;
              onData({ phase: 'stats', hop: s.hop, address: s.address,
                sent: s.sent, recv: s.recv, loss: s.loss,
                last: s.last, avg: s.avg, best: s.best, worst: s.worst });
            }
          }
        }
      });

      pingProc.stderr.setEncoding('utf8');
      pingProc.stderr.on('data', () => {});

      pingProc.on('close', () => {
        // Finalize accurate sent count and loss%
        s.sent = numPackets;
        s.loss = +(((s.sent - s.recv) / s.sent) * 100).toFixed(1);
        onData({ phase: 'stats', hop: s.hop, address: s.address,
          sent: s.sent, recv: s.recv, loss: s.loss,
          last: s.last, avg: s.avg, best: s.best, worst: s.worst });

        doneCount++;
        if (doneCount === validHops.length && !killed) {
          const hops = orderedHops.map(({ hop, ip: hopIp }) => {
            if (hopIp === '*') return makeTimeoutHop(hop);
            const hs = hopStats[hopIp];
            return {
              hop: hs.hop, address: hs.address,
              sent: hs.sent, recv: hs.recv, loss: hs.loss,
              last: hs.last, avg: hs.avg, best: hs.best, worst: hs.worst,
            };
          });
          onResult({ host, hops, exitCode: 0 });
        }
      });
    }
  });

  return { kill: killAll };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function makeTimeoutHop(hop) {
  return {
    hop, address: '*', sent: 0, recv: 0, loss: 100,
    last: null, avg: null, best: null, worst: null,
  };
}

/**
 * Parse a Windows tracert hop line (trimmed).
 * Returns IP string, '*', or undefined (not a hop line).
 * Works for all Windows locales — no language-specific strings used.
 *   "1    14 ms   13 ms   14 ms   8.8.8.8"
 *   "2     *        *        *     Request timed out."
 */
function extractWindowsHopIP(line) {
  // Hop lines start with a number followed by whitespace
  if (!/^\d+\s/.test(line)) return undefined;
  // Timeout hops have three asterisks
  if (/\*\s+\*\s+\*/.test(line)) return '*';
  // Extract IPv4 address at end of line
  const m = line.match(/(\d{1,3}\.){3}\d{1,3}/);
  return m ? m[0] : undefined;
}

/**
 * Parse a Unix traceroute hop line (trimmed).
 * "  1  192.168.1.1  1.234 ms  1.456 ms  1.789 ms"
 * "  2  * * *"
 */
function extractUnixHopIP(line) {
  const m = line.match(/^\s*\d+\s+([*\d.]+)/);
  if (!m) return undefined;
  return m[1] === '*' ? '*' : m[1];
}

/**
 * Extract RTT ms from a Windows ping reply line.
 * Language-agnostic: matches "=14ms", "<1ms", "= 14 ms", "tempo=14ms", etc.
 * Caller must pre-check that TTL= is present.
 *
 * @returns {number} RTT in ms (minimum 1)
 */
function extractWindowsRTT(line) {
  const m = line.match(/[<=](\d+)\s*ms/i);
  return m ? Math.max(1, parseInt(m[1])) : 1;
}

/**
 * Extract RTT from a Unix ping reply line.
 * "64 bytes from 8.8.8.8: icmp_seq=1 ttl=55 time=14.3 ms"
 */
function extractUnixRTT(line) {
  const m = line.match(/time=([\d.]+)\s*ms/i);
  return m ? parseFloat(m[1]) : null;
}

module.exports = { runMTR };
