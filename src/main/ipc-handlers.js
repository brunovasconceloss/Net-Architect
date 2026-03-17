'use strict';

const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const security = require('./security');
const ping = require('./tools/ping');
const traceroute = require('./tools/traceroute');
const fping = require('./tools/fping');
const tcpping = require('./tools/tcpping');
const httpTools = require('./tools/http-tools');
const iperf = require('./tools/iperf');

function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function send(channel, data) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function register() {
  // ── App info ────────────────────────────────────────────────────────
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getClaudemd', () => {
    const p = path.join(app.getAppPath(), 'CLAUDE.md');
    try { return fs.readFileSync(p, 'utf8'); } catch { return '# CLAUDE.md not found'; }
  });

  // ── Ping ────────────────────────────────────────────────────────────
  ipcMain.handle('ping:run', (_e, host, count) => {
    const safeHost = security.sanitizeHostname(host);
    const safeCount = Math.max(1, Math.min(100, parseInt(count) || 4));
    return new Promise((resolve) => {
      ping.runPing(
        safeHost,
        safeCount,
        (data) => send('ping:data', data),
        (result) => { send('ping:result', result); resolve(result); }
      );
    });
  });

  // ── Traceroute ──────────────────────────────────────────────────────
  ipcMain.handle('traceroute:run', (_e, host) => {
    const safeHost = security.sanitizeHostname(host);
    return new Promise((resolve) => {
      traceroute.runTraceroute(
        safeHost,
        (data) => send('traceroute:data', data),
        (result) => { send('traceroute:result', result); resolve(result); }
      );
    });
  });

  // ── Bulk Ping (fping) ───────────────────────────────────────────────
  let fpingHandle = null;
  ipcMain.handle('fping:run', (_e, cidr) => {
    const safeCIDR = security.sanitizeCIDR(cidr);
    return new Promise((resolve) => {
      fpingHandle = fping.runFping(
        safeCIDR,
        (data) => send('fping:progress', data),
        (result) => { send('fping:result', result); resolve(result); }
      );
    });
  });

  // ── TCP Ping ────────────────────────────────────────────────────────
  ipcMain.handle('tcpping:run', (_e, host, port) => {
    const safeHost = security.sanitizeHostname(host);
    const safePort = security.sanitizePort(port);
    return new Promise((resolve) => {
      tcpping.runTCPPing(
        safeHost,
        safePort,
        4,
        (result) => { send('tcpping:result', result); resolve(result); }
      );
    });
  });

  // ── HTTP / DNS ──────────────────────────────────────────────────────
  ipcMain.handle('http:request', async (_e, url, method) => {
    const safeURL = security.sanitizeURL(url);
    return httpTools.httpRequest(safeURL, method || 'GET');
  });

  ipcMain.handle('dns:query', async (_e, host, type) => {
    const safeHost = security.sanitizeHostname(host);
    const safeType = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'PTR', 'CNAME', 'SOA'].includes((type || '').toUpperCase())
      ? type.toUpperCase()
      : 'A';
    return httpTools.dnsQuery(safeHost, safeType);
  });

  // ── iPerf3 ──────────────────────────────────────────────────────────
  ipcMain.handle('iperf:startClient', (_e, host, port, duration) => {
    const safeHost = security.sanitizeHostname(host);
    const safePort = security.sanitizePort(port);
    const safeDur = Math.max(1, Math.min(300, parseInt(duration) || 10));
    return new Promise((resolve) => {
      iperf.startClient(
        safeHost, safePort, safeDur,
        (data) => send('iperf:data', data),
        (result) => { send('iperf:result', result); resolve(result); }
      );
    });
  });

  ipcMain.handle('iperf:startServer', (_e, port) => {
    const safePort = security.sanitizePort(port);
    return new Promise((resolve) => {
      iperf.startServer(
        safePort,
        (data) => send('iperf:data', data),
        (result) => { send('iperf:result', result); resolve(result); }
      );
    });
  });

  ipcMain.handle('iperf:stop', () => {
    iperf.stopIperf();
    return { stopped: true };
  });
}

module.exports = { register };
