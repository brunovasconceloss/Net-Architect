/**
 * About view — App information, version, and CLAUDE.md content.
 */

import { showToast } from '../components/notification.js';

export function render() {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">// ABOUT</h1>
      <p class="page-subtitle">Net Architect — The Network Engineer's Partner</p>
    </div>

    <div class="grid-2" style="margin-bottom:var(--space-lg)">
      <div class="panel scan-container">
        <p class="panel-title">Application Info</p>
        <table class="data-table">
          <tbody>
            <tr><td style="color:var(--text-secondary)">Version</td><td id="about-version">—</td></tr>
            <tr><td style="color:var(--text-secondary)">Platform</td><td id="about-platform">—</td></tr>
            <tr><td style="color:var(--text-secondary)">Engine</td><td>Electron + Chromium</td></tr>
            <tr><td style="color:var(--text-secondary)">Stack</td><td>Vanilla JS ES2022, No bundler</td></tr>
            <tr><td style="color:var(--text-secondary)">Theme</td><td>Jarvis / Iron Man Dark</td></tr>
            <tr><td style="color:var(--text-secondary)">Author</td><td>Bruno Vasconcelos</td></tr>
            <tr><td style="color:var(--text-secondary)">License</td><td>MIT</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <p class="panel-title">Features</p>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:8px">
          ${[
            ['IPv4 / IPv6 Subnet Calculator', 'cyan'],
            ['VLSM Planner', 'cyan'],
            ['Network Topology Visualizer (ASCII + SVG)', 'green'],
            ['Config Generator (Cisco / Juniper / Huawei)', 'green'],
            ['Ping & Traceroute', 'amber'],
            ['Bulk Ping (CIDR sweep)', 'amber'],
            ['TCP Ping', 'amber'],
            ['Packet Capture (tcpdump)', 'amber'],
            ['HTTP & DNS Diagnostics', 'amber'],
            ['iPerf3 Bandwidth Testing', 'amber'],
          ].map(([label, color]) => `
            <li style="display:flex;align-items:center;gap:8px;font-size:0.82rem">
              <span style="width:6px;height:6px;border-radius:50%;background:var(--${color}-base);flex-shrink:0"></span>
              ${label}
            </li>
          `).join('')}
        </ul>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <p class="panel-title" style="margin:0">CLAUDE.md</p>
        <span style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono)">Auto-updated with each release</span>
      </div>
      <div class="terminal" id="claude-md-content" style="max-height:500px;white-space:pre-wrap;user-select:text">
        <span style="color:var(--text-muted)">Loading...</span>
      </div>
    </div>
  `;

  // Load app info from IPC
  if (typeof window.netAPI !== 'undefined') {
    window.netAPI.app.getVersion().then(v => {
      const el2 = el.querySelector('#about-version');
      if (el2) el2.textContent = v;
    }).catch(() => {});

    window.netAPI.app.getPlatform().then(p => {
      const el2 = el.querySelector('#about-platform');
      if (el2) el2.textContent = p;
    }).catch(() => {});

    window.netAPI.app.getClaudemd().then(content => {
      const el2 = el.querySelector('#claude-md-content');
      if (el2) el2.textContent = content;
    }).catch(err => {
      const el2 = el.querySelector('#claude-md-content');
      if (el2) el2.textContent = `Error loading CLAUDE.md: ${err.message}`;
    });
  } else {
    el.querySelector('#about-version').textContent = '(dev mode)';
    el.querySelector('#about-platform').textContent = navigator.platform;
    el.querySelector('#claude-md-content').textContent = 'Running outside Electron — CLAUDE.md not available.';
  }

  return el;
}
