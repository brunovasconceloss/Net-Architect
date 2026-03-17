'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Only expose named methods — renderer cannot invoke arbitrary IPC channels
contextBridge.exposeInMainWorld('netAPI', {
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getClaudemd: () => ipcRenderer.invoke('app:getClaudemd'),
  },

  // Ping
  ping: {
    run: (host, count) => ipcRenderer.invoke('ping:run', host, count),
    onData: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('ping:data', handler);
      return () => ipcRenderer.removeListener('ping:data', handler);
    },
    onResult: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('ping:result', handler);
      return () => ipcRenderer.removeListener('ping:result', handler);
    },
  },

  // Traceroute
  traceroute: {
    run: (host) => ipcRenderer.invoke('traceroute:run', host),
    onData: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('traceroute:data', handler);
      return () => ipcRenderer.removeListener('traceroute:data', handler);
    },
    onResult: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('traceroute:result', handler);
      return () => ipcRenderer.removeListener('traceroute:result', handler);
    },
  },

  // Bulk Ping (fping)
  fping: {
    run: (cidr) => ipcRenderer.invoke('fping:run', cidr),
    onProgress: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('fping:progress', handler);
      return () => ipcRenderer.removeListener('fping:progress', handler);
    },
    onResult: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('fping:result', handler);
      return () => ipcRenderer.removeListener('fping:result', handler);
    },
  },

  // TCP Ping
  tcpping: {
    run: (host, port) => ipcRenderer.invoke('tcpping:run', host, port),
    onResult: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('tcpping:result', handler);
      return () => ipcRenderer.removeListener('tcpping:result', handler);
    },
  },

  // HTTP / DNS
  http: {
    request: (url, method) => ipcRenderer.invoke('http:request', url, method),
  },
  dns: {
    query: (host, type) => ipcRenderer.invoke('dns:query', host, type),
  },

  // iPerf3
  iperf: {
    startClient: (host, port, duration) => ipcRenderer.invoke('iperf:startClient', host, port, duration),
    startServer: (port) => ipcRenderer.invoke('iperf:startServer', port),
    stop: () => ipcRenderer.invoke('iperf:stop'),
    onData: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('iperf:data', handler);
      return () => ipcRenderer.removeListener('iperf:data', handler);
    },
    onResult: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('iperf:result', handler);
      return () => ipcRenderer.removeListener('iperf:result', handler);
    },
  },
});
