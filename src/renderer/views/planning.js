/**
 * Planning view — Subnet Calculator (IPv4/IPv6) + VLSM Planner.
 */

import { parseIPv4, validateIPv4 } from '../lib/ipv4.js';
import { parseIPv6, validateIPv6 } from '../lib/ipv6.js';
import { calculateVLSM } from '../lib/vlsm.js';
import { createCopyButton } from '../components/copy-button.js';
import { createExportMenu } from '../components/export-menu.js';
import { showToast } from '../components/notification.js';

export function render() {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">// PLANNING</h1>
      <p class="page-subtitle">Subnet Calculator &amp; VLSM Planner</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="subnet-calc">Subnet Calculator</button>
      <button class="tab-btn" data-tab="ipv6-calc">IPv6 Calculator</button>
      <button class="tab-btn" data-tab="vlsm">VLSM Planner</button>
    </div>

    <!-- ── Subnet Calc Tab ─────────────────────────── -->
    <div class="tab-panel active" id="tab-subnet-calc">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">IPv4 Input</p>
          <div class="form-group">
            <label class="form-label">IP Address / CIDR</label>
            <input class="form-input" id="ipv4-input" placeholder="e.g. 192.168.1.0/24" type="text">
          </div>
          <button class="btn btn-primary" id="ipv4-calc-btn" style="width:100%">
            CALCULATE
          </button>
        </div>

        <div class="panel" id="ipv4-result-panel" style="display:none">
          <p class="panel-title">Results</p>
          <div id="ipv4-result-content"></div>
        </div>
      </div>
    </div>

    <!-- ── IPv6 Calc Tab ───────────────────────────── -->
    <div class="tab-panel" id="tab-ipv6-calc">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">IPv6 Input</p>
          <div class="form-group">
            <label class="form-label">IPv6 Address / Prefix</label>
            <input class="form-input" id="ipv6-input" placeholder="e.g. 2001:db8::/32" type="text">
          </div>
          <button class="btn btn-primary" id="ipv6-calc-btn" style="width:100%">
            CALCULATE
          </button>
        </div>

        <div class="panel" id="ipv6-result-panel" style="display:none">
          <p class="panel-title">Results</p>
          <div id="ipv6-result-content"></div>
        </div>
      </div>
    </div>

    <!-- ── VLSM Tab ──────────────────────────────────── -->
    <div class="tab-panel" id="tab-vlsm">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">VLSM Configuration</p>
          <div class="form-group">
            <label class="form-label">Base Network (CIDR)</label>
            <input class="form-input" id="vlsm-base" placeholder="e.g. 192.168.0.0/20" type="text">
          </div>

          <p class="form-label" style="margin-bottom:8px">Segments</p>
          <div id="vlsm-segments-list"></div>

          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-ghost" id="vlsm-add-segment" style="flex:1">+ Add Segment</button>
            <button class="btn btn-primary" id="vlsm-calc-btn" style="flex:1">CALCULATE</button>
          </div>
        </div>

        <div class="panel" style="min-height:200px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <p class="panel-title" style="margin:0">Allocations</p>
            <div id="vlsm-export-area" style="display:flex;gap:8px"></div>
          </div>
          <div id="vlsm-result"></div>
        </div>
      </div>
    </div>
  `;

  // ── Tab switching ──────────────────────────────────────────────────
  const tabs = el.querySelectorAll('.tab-btn');
  const panels = el.querySelectorAll('.tab-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      el.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ── IPv4 Calculator ────────────────────────────────────────────────
  const ipv4Input = el.querySelector('#ipv4-input');
  const ipv4CalcBtn = el.querySelector('#ipv4-calc-btn');
  const ipv4ResultPanel = el.querySelector('#ipv4-result-panel');
  const ipv4ResultContent = el.querySelector('#ipv4-result-content');

  function calcIPv4() {
    const val = ipv4Input.value.trim();
    if (!val.includes('/')) {
      showToast('Enter in CIDR format: x.x.x.x/n', 'warning');
      return;
    }
    try {
      const info = parseIPv4(val);
      renderIPv4Result(info, ipv4ResultContent);
      ipv4ResultPanel.style.display = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  ipv4CalcBtn.addEventListener('click', calcIPv4);
  ipv4Input.addEventListener('keydown', e => { if (e.key === 'Enter') calcIPv4(); });

  function renderIPv4Result(info, container) {
    const rows = [
      { k: 'IP Address',        v: info.ip },
      { k: 'CIDR',              v: info.cidr },
      { k: 'Network Address',   v: info.networkAddress },
      { k: 'Broadcast Address', v: info.broadcastAddress },
      { k: 'Subnet Mask',       v: info.subnetMask },
      { k: 'Wildcard Mask',     v: info.wildcardMask },
      { k: 'First Host',        v: info.firstHost },
      { k: 'Last Host',         v: info.lastHost },
      { k: 'Usable Hosts',      v: info.usableHosts.toLocaleString() },
      { k: 'Total Hosts',       v: info.totalHosts.toLocaleString() },
      { k: 'IP Class',          v: info.ipClass },
      { k: 'Private',           v: info.isPrivate ? 'Yes' : 'No' },
    ];

    container.innerHTML = `
      <table class="data-table">
        <tbody>
          ${rows.map(r => `<tr><td style="color:var(--text-secondary)">${r.k}</td><td>${r.v}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px">
        <p class="form-label">Binary Representation</p>
        <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--cyan-pale);word-break:break-all;background:var(--bg-dark);padding:8px;border-radius:4px;line-height:1.8">
          IP:   ${info.binaryIP}<br>
          Mask: ${info.binaryMask}
        </div>
      </div>
    `;
  }

  // ── IPv6 Calculator ────────────────────────────────────────────────
  const ipv6Input = el.querySelector('#ipv6-input');
  const ipv6CalcBtn = el.querySelector('#ipv6-calc-btn');
  const ipv6ResultPanel = el.querySelector('#ipv6-result-panel');
  const ipv6ResultContent = el.querySelector('#ipv6-result-content');

  function calcIPv6() {
    const val = ipv6Input.value.trim();
    const addr = val.split('/')[0];
    if (!validateIPv6(addr)) {
      showToast('Invalid IPv6 address', 'warning');
      return;
    }
    try {
      const info = parseIPv6(val.includes('/') ? val : `${val}/128`);
      renderIPv6Result(info, ipv6ResultContent);
      ipv6ResultPanel.style.display = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  ipv6CalcBtn.addEventListener('click', calcIPv6);
  ipv6Input.addEventListener('keydown', e => { if (e.key === 'Enter') calcIPv6(); });

  function renderIPv6Result(info, container) {
    container.innerHTML = `
      <table class="data-table">
        <tbody>
          <tr><td style="color:var(--text-secondary)">Address</td><td>${info.address}</td></tr>
          <tr><td style="color:var(--text-secondary)">Compressed</td><td>${info.compressed}</td></tr>
          <tr><td style="color:var(--text-secondary)">Expanded</td><td style="font-size:0.75rem;word-break:break-all">${info.expanded}</td></tr>
          <tr><td style="color:var(--text-secondary)">Prefix</td><td>/${info.prefix}</td></tr>
          <tr><td style="color:var(--text-secondary)">Network</td><td>${info.networkAddress}</td></tr>
          <tr><td style="color:var(--text-secondary)">Type</td><td>${info.type}</td></tr>
          <tr><td style="color:var(--text-secondary)">Total Addresses</td><td>${info.totalAddresses.toLocaleString()}</td></tr>
        </tbody>
      </table>
    `;
  }

  // ── VLSM Planner ───────────────────────────────────────────────────
  const segmentsList = el.querySelector('#vlsm-segments-list');
  const addSegmentBtn = el.querySelector('#vlsm-add-segment');
  const vlsmCalcBtn = el.querySelector('#vlsm-calc-btn');
  const vlsmResult = el.querySelector('#vlsm-result');
  const vlsmExportArea = el.querySelector('#vlsm-export-area');

  let vlsmAllocations = null;

  function addSegment(name = '', hosts = '') {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';
    row.innerHTML = `
      <input class="form-input seg-name" placeholder="Name (e.g. LAN-A)" style="flex:1" value="${name}">
      <input class="form-input seg-hosts" placeholder="Hosts" type="number" min="1" style="width:90px" value="${hosts}">
      <button class="btn btn-ghost remove-seg" style="padding:6px 8px;font-size:1rem;line-height:1">×</button>
    `;
    row.querySelector('.remove-seg').addEventListener('click', () => row.remove());
    segmentsList.appendChild(row);
  }

  // Pre-populate 3 default segments
  addSegment('LAN-A', 50);
  addSegment('LAN-B', 25);
  addSegment('Management', 10);

  addSegmentBtn.addEventListener('click', () => addSegment());

  vlsmCalcBtn.addEventListener('click', () => {
    const base = el.querySelector('#vlsm-base').value.trim();
    if (!base.includes('/')) { showToast('Enter base network in CIDR format', 'warning'); return; }

    const rows = segmentsList.querySelectorAll('div');
    const segments = [];
    for (const row of rows) {
      const name = row.querySelector('.seg-name')?.value.trim() || `Segment-${segments.length + 1}`;
      const hosts = parseInt(row.querySelector('.seg-hosts')?.value);
      if (!hosts || hosts < 1) { showToast(`Invalid host count for "${name}"`, 'error'); return; }
      segments.push({ name, hosts });
    }

    if (segments.length === 0) { showToast('Add at least one segment', 'warning'); return; }

    try {
      const result = calculateVLSM(base, segments);
      vlsmAllocations = result.allocations;

      if (result.error) {
        showToast(result.error, 'error');
      }

      renderVLSMResult(result, vlsmResult, base);

      // Export menu
      vlsmExportArea.innerHTML = '';
      const exportMenu = createExportMenu({
        getData: () => vlsmAllocations?.filter(a => !a.error).map(a => ({
          Name: a.name, CIDR: a.cidr, Network: a.network, Mask: a.subnetMask,
          'First Host': a.firstHost, 'Last Host': a.lastHost, Broadcast: a.broadcast,
          'Usable Hosts': a.usableHosts,
        })),
        filename: 'vlsm-plan',
      });
      vlsmExportArea.appendChild(exportMenu);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  function renderVLSMResult(result, container, base) {
    const { allocations, remaining } = result;

    const tableRows = allocations.map(a => {
      if (a.error) return `<tr><td colspan="6" style="color:var(--text-error)">[ERR] ${a.name}: ${a.error}</td></tr>`;
      return `
        <tr>
          <td>${a.name}</td>
          <td>${a.cidr}</td>
          <td>${a.subnetMask}</td>
          <td>${a.firstHost} – ${a.lastHost}</td>
          <td>${a.usableHosts.toLocaleString()}</td>
          <td>${a.requestedHosts.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Segment</th><th>CIDR</th><th>Mask</th>
            <th>Host Range</th><th>Usable</th><th>Requested</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      ${remaining.length > 0 ? `
        <div style="margin-top:12px;padding:8px 12px;background:var(--bg-dark);border-radius:4px;border:1px solid var(--border-subtle)">
          <span style="color:var(--text-muted);font-size:0.75rem">REMAINING SPACE: </span>
          <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-secondary)">${remaining.join(', ')}</span>
        </div>
      ` : ''}
    `;
  }

  return el;
}
