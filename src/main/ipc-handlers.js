'use strict';

const { ipcMain, app, BrowserWindow } = require('electron');
const security = require('./security');
const ping = require('./tools/ping');
const mtr = require('./tools/mtr');
const fping = require('./tools/fping');
const tcpping = require('./tools/tcpping');
const httpTools = require('./tools/http-tools');
const iperf = require('./tools/iperf');
const geo = require('./tools/geo');

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

  // ── MTR ─────────────────────────────────────────────────────────────
  ipcMain.handle('mtr:run', (_e, host, packets) => {
    const safeHost = security.sanitizeHostname(host);
    const safePkts = Math.max(10, Math.min(200, parseInt(packets) || 50));
    return new Promise((resolve) => {
      mtr.runMTR(
        safeHost,
        safePkts,
        (data) => send('mtr:data', data),
        (result) => { send('mtr:result', result); resolve(result); }
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
    let normalizedUrl = (url || '').trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl;
    const safeURL = security.sanitizeURL(normalizedUrl);
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

  // ── Geo Lookup ──────────────────────────────────────────────────────
  ipcMain.handle('geo:lookup', async (_e, ip) => {
    const safeIP = security.sanitizeHostname(ip);
    return geo.geoLookup(safeIP);
  });

  ipcMain.handle('geo:batch', async (_e, ips) => {
    if (!Array.isArray(ips)) return [];
    const safeIPs = ips
      .filter(ip => typeof ip === 'string' && ip.trim().length > 0)
      .map(ip => ip.trim())
      .slice(0, 100);
    return geo.geoBatch(safeIPs);
  });
}

module.exports = { register };
