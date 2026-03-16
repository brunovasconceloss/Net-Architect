/**
 * Tools view — Config Generator + Export Tools.
 */

import { parseIPv4 } from '../lib/ipv4.js';
import { calculateVLSM } from '../lib/vlsm.js';
import { generateCisco, generateJuniper, generateHuawei } from '../lib/config-gen.js';
import { createCopyButton } from '../components/copy-button.js';
import { downloadFile } from '../lib/exporter.js';
import { showToast } from '../components/notification.js';

export function render() {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">// TOOLS</h1>
      <p class="page-subtitle">Config Generator &amp; Export</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="config-gen">Config Generator</button>
      <button class="tab-btn" data-tab="export-tools">Export Tools</button>
    </div>

    <!-- Config Generator -->
    <div class="tab-panel active" id="tab-config-gen">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">Configuration</p>
          <div class="form-group">
            <label class="form-label">Base Network</label>
            <input class="form-input" id="cfg-base" placeholder="192.168.0.0/20" value="192.168.0.0/20">
          </div>
          <div class="form-group">
            <label class="form-label">Hostname</label>
            <input class="form-input" id="cfg-hostname" placeholder="ROUTER-1" value="ROUTER-1">
          </div>
          <div class="form-group">
            <label class="form-label">Vendor</label>
            <select class="form-select" id="cfg-vendor">
              <option value="cisco">Cisco IOS / IOS-XE</option>
              <option value="juniper">Juniper Junos</option>
              <option value="huawei">Huawei VRP</option>
            </select>
          </div>
          <p class="form-label" style="margin-bottom:8px">Segments (Name,Hosts per line)</p>
          <textarea class="form-input" id="cfg-segments" rows="5" style="resize:vertical;user-select:text">LAN-A,50
LAN-B,25
Management,10</textarea>
          <button class="btn btn-primary" id="cfg-gen-btn" style="width:100%;margin-top:12px">GENERATE CONFIG</button>
        </div>

        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <p class="panel-title" style="margin:0">Output</p>
            <div style="display:flex;gap:8px" id="cfg-action-area"></div>
          </div>
          <div class="terminal" id="cfg-output" style="min-height:300px;white-space:pre;user-select:text"></div>
        </div>
      </div>
    </div>

    <!-- Export Tools -->
    <div class="tab-panel" id="tab-export-tools">
      <div class="panel">
        <p class="panel-title">Quick Export</p>
        <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:var(--space-lg)">
          Generate and download files. First complete your VLSM plan in the Planning section.
        </p>
        <div class="grid-3">
          <div class="stat-card">
            <div class="stat-value" style="font-size:1rem">CSV</div>
            <div class="stat-label">Subnet table export</div>
            <button class="btn btn-ghost" id="exp-csv-btn" style="width:100%;margin-top:12px">Download CSV</button>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:1rem">TXT</div>
            <div class="stat-label">Plain text report</div>
            <button class="btn btn-ghost" id="exp-txt-btn" style="width:100%;margin-top:12px">Download TXT</button>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:1rem">MD</div>
            <div class="stat-label">Markdown table</div>
            <button class="btn btn-ghost" id="exp-md-btn" style="width:100%;margin-top:12px">Download MD</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  el.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      el.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Config Generator
  const cfgOutput = el.querySelector('#cfg-output');
  const cfgActionArea = el.querySelector('#cfg-action-area');
  let currentConfig = '';

  el.querySelector('#cfg-gen-btn').addEventListener('click', () => {
    const base = el.querySelector('#cfg-base').value.trim();
    const hostname = el.querySelector('#cfg-hostname').value.trim() || 'ROUTER-1';
    const vendor = el.querySelector('#cfg-vendor').value;
    const lines = el.querySelector('#cfg-segments').value.trim().split('\n').filter(Boolean);

    if (!base.includes('/')) { showToast('Enter base network in CIDR format', 'warning'); return; }

    const segments = [];
    for (const line of lines) {
      const [name, hostsStr] = line.split(',').map(s => s.trim());
      const hosts = parseInt(hostsStr);
      if (!name || !hosts) { showToast(`Invalid segment: "${line}"`, 'error'); return; }
      segments.push({ name, hosts });
    }

    try {
      const { allocations } = calculateVLSM(base, segments);
      const options = { hostname };

      switch (vendor) {
        case 'cisco':   currentConfig = generateCisco(allocations, options); break;
        case 'juniper': currentConfig = generateJuniper(allocations, options); break;
        case 'huawei':  currentConfig = generateHuawei(allocations, options); break;
      }

      cfgOutput.textContent = currentConfig;

      cfgActionArea.innerHTML = '';
      cfgActionArea.appendChild(createCopyButton(() => currentConfig));

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn-ghost';
      dlBtn.textContent = 'Download';
      dlBtn.addEventListener('click', () => {
        const ext = vendor === 'juniper' ? 'conf' : 'txt';
        downloadFile(currentConfig, `${hostname}-${vendor}.${ext}`);
      });
      cfgActionArea.appendChild(dlBtn);

      showToast('Config generated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Export quick buttons — demo data
  const demoData = [
    { CIDR: '192.168.0.0/26', Name: 'LAN-A', Hosts: 62 },
    { CIDR: '192.168.0.64/27', Name: 'LAN-B', Hosts: 30 },
    { CIDR: '192.168.0.96/28', Name: 'Management', Hosts: 14 },
  ];

  el.querySelector('#exp-csv-btn').addEventListener('click', () => {
    import('../lib/exporter.js').then(({ toCSV, downloadFile: dl }) => {
      dl(toCSV(demoData), 'subnets.csv', 'text/csv');
    });
  });
  el.querySelector('#exp-txt-btn').addEventListener('click', () => {
    import('../lib/exporter.js').then(({ toTXT, downloadFile: dl }) => {
      dl(toTXT(demoData), 'subnets.txt');
    });
  });
  el.querySelector('#exp-md-btn').addEventListener('click', () => {
    import('../lib/exporter.js').then(({ toMarkdown, downloadFile: dl }) => {
      dl(toMarkdown(demoData), 'subnets.md', 'text/markdown');
    });
  });

  return el;
}
