/**
 * Testing view — all network diagnostic tools.
 */

import { TerminalOutput } from '../components/terminal-output.js';
import { ResultsTable } from '../components/results-table.js';
import { ProgressBar } from '../components/progress-bar.js';
import { createCopyButton } from '../components/copy-button.js';
import { showToast } from '../components/notification.js';

export function render() {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">// TESTING</h1>
      <p class="page-subtitle">Network Diagnostics &amp; Analysis</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="ping">Ping</button>
      <button class="tab-btn" data-tab="traceroute">MTR</button>
      <button class="tab-btn" data-tab="bulk-ping">Bulk Ping</button>
      <button class="tab-btn" data-tab="tcp-ping">TCP Ping</button>
      <button class="tab-btn" data-tab="http-dns">HTTP / DNS</button>
      <button class="tab-btn" data-tab="ip-lookup">IP Lookup</button>
      <button class="tab-btn" data-tab="iperf">iPerf3</button>
    </div>

    <!-- Ping -->
    <div class="tab-panel active" id="tab-ping"></div>

    <!-- Traceroute -->
    <div class="tab-panel" id="tab-traceroute"></div>

    <!-- Bulk Ping -->
    <div class="tab-panel" id="tab-bulk-ping"></div>

    <!-- TCP Ping -->
    <div class="tab-panel" id="tab-tcp-ping"></div>

    <!-- HTTP / DNS -->
    <div class="tab-panel" id="tab-http-dns"></div>

    <!-- IP Lookup -->
    <div class="tab-panel" id="tab-ip-lookup"></div>

    <!-- iPerf3 -->
    <div class="tab-panel" id="tab-iperf"></div>
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

  buildPingTab(el.querySelector('#tab-ping'));
  buildMTRTab(el.querySelector('#tab-traceroute'));
  buildBulkPingTab(el.querySelector('#tab-bulk-ping'));
  buildTCPPingTab(el.querySelector('#tab-tcp-ping'));
  buildHTTPDNSTab(el.querySelector('#tab-http-dns'));
  buildIPLookupTab(el.querySelector('#tab-ip-lookup'));
  buildIperfTab(el.querySelector('#tab-iperf'));

  return el;
}

// ── Helper: check if netAPI is available ──────────────────────────────
function hasAPI() {
  return typeof window.netAPI !== 'undefined';
}

function noAPIMsg(container) {
  container.innerHTML = `
    <div class="panel" style="margin-top:8px">
      <p style="color:var(--text-warning);font-family:var(--font-mono);font-size:0.8rem">
        ⚠ Network API not available. Run as Electron app to use this feature.
      </p>
    </div>`;
}

// ── Ping Tab ──────────────────────────────────────────────────────────
function buildPingTab(container) {
  const term = new TerminalOutput();

  container.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">Ping</p>
        <div class="form-group">
          <label class="form-label">Host / IP</label>
          <input class="form-input" id="ping-host" placeholder="8.8.8.8" value="8.8.8.8">
        </div>
        <div class="form-group">
          <label class="form-label">Count</label>
          <input class="form-input" id="ping-count" type="number" value="4" min="1" max="100">
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" id="ping-run-btn" style="flex:1">RUN PING</button>
          <div id="ping-copy-area"></div>
        </div>
      </div>

      <div class="panel">
        <p class="panel-title">Stats</p>
        <div class="grid-3" id="ping-stats" style="gap:8px">
          <div class="stat-card"><div class="stat-value" id="stat-sent">—</div><div class="stat-label">Sent</div></div>
          <div class="stat-card"><div class="stat-value" id="stat-recv">—</div><div class="stat-label">Received</div></div>
          <div class="stat-card"><div class="stat-value" id="stat-loss">—</div><div class="stat-label">Loss %</div></div>
          <div class="stat-card"><div class="stat-value" id="stat-min">—</div><div class="stat-label">Min ms</div></div>
          <div class="stat-card"><div class="stat-value" id="stat-avg">—</div><div class="stat-label">Avg ms</div></div>
          <div class="stat-card"><div class="stat-value" id="stat-max">—</div><div class="stat-label">Max ms</div></div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:var(--space-md)">
      <p class="panel-title">Output</p>
      <div id="ping-terminal-mount"></div>
    </div>
  `;

  container.querySelector('#ping-terminal-mount').appendChild(term.el);
  container.querySelector('#ping-copy-area').appendChild(createCopyButton(() => term.getText()));

  container.querySelector('#ping-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const host = container.querySelector('#ping-host').value.trim();
    const count = parseInt(container.querySelector('#ping-count').value) || 4;
    if (!host) { showToast('Enter a host', 'warning'); return; }

    term.clear();
    term.append(`Pinging ${host} (${count} packets)...`, 'muted');

    const removeData = window.netAPI.ping.onData(({ line, error }) => {
      term.append(line, error ? 'error' : 'default');
    });
    const removeResult = window.netAPI.ping.onResult((result) => {
      removeData(); removeResult();
      container.querySelector('#stat-sent').textContent = result.sent;
      container.querySelector('#stat-recv').textContent = result.received;
      container.querySelector('#stat-loss').textContent = `${result.loss}%`;
      container.querySelector('#stat-min').textContent = result.min ?? '—';
      container.querySelector('#stat-avg').textContent = result.avg ?? '—';
      container.querySelector('#stat-max').textContent = result.max ?? '—';
    });

    try {
      await window.netAPI.ping.run(host, count);
    } catch (err) {
      term.append(`Error: ${err.message}`, 'error');
    }
  });
}

// ── MTR Tab ───────────────────────────────────────────────────────────
function buildMTRTab(container) {
  const progress = new ProgressBar();

  container.innerHTML = `
    <div class="panel" style="margin-bottom:var(--space-md)">
      <p class="panel-title">MTR — My Traceroute</p>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:10px">
        <div class="form-group" style="flex:1;margin:0">
          <label class="form-label">Host / IP</label>
          <input class="form-input" id="mtr-host" placeholder="8.8.8.8" value="8.8.8.8">
        </div>
        <div class="form-group" style="width:100px;margin:0">
          <label class="form-label">Packets</label>
          <input class="form-input" id="mtr-packets" type="number" value="50" min="10" max="200">
        </div>
        <button class="btn btn-primary" id="mtr-run-btn">RUN MTR</button>
      </div>
      <div id="mtr-progress-mount"></div>
      <div id="mtr-status" style="margin-top:6px;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted)"></div>
    </div>
    <div class="panel">
      <p class="panel-title">Route Statistics</p>
      <div style="overflow-x:auto">
        <table class="data-table" id="mtr-table">
          <thead>
            <tr>
              <th style="width:48px">Hop</th>
              <th>Address</th>
              <th style="width:70px">Loss%</th>
              <th style="width:55px">Sent</th>
              <th style="width:55px">Recv</th>
              <th style="width:70px">Last ms</th>
              <th style="width:70px">Avg ms</th>
              <th style="width:70px">Best ms</th>
              <th style="width:70px">Worst ms</th>
              <th style="min-width:140px">Location</th>
            </tr>
          </thead>
          <tbody id="mtr-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#mtr-progress-mount').appendChild(progress.el);

  // Map from hop number → <tr> element for live updates
  const rowMap = {};

  function getOrCreateRow(hop, address) {
    if (rowMap[hop]) return rowMap[hop];
    const tbody = container.querySelector('#mtr-tbody');
    const tr = document.createElement('tr');
    tr.dataset.hop = hop;
    tr.innerHTML = `
      <td>${hop}</td>
      <td style="font-family:var(--font-mono)">${escapeHTML(address)}</td>
      <td id="mtr-loss-${hop}">—</td>
      <td id="mtr-sent-${hop}">—</td>
      <td id="mtr-recv-${hop}">—</td>
      <td id="mtr-last-${hop}">—</td>
      <td id="mtr-avg-${hop}">—</td>
      <td id="mtr-best-${hop}">—</td>
      <td id="mtr-worst-${hop}">—</td>
      <td id="mtr-loc-${hop}" style="color:var(--text-muted);font-size:0.8em">—</td>
    `;
    tbody.appendChild(tr);
    rowMap[hop] = tr;
    return tr;
  }

  function updateRowStats(data) {
    const tr = rowMap[data.hop];
    if (!tr) return;

    const fmt = v => v != null ? String(v) : '—';

    tr.querySelector(`#mtr-loss-${data.hop}`).textContent  = data.sent > 0 ? `${data.loss}%` : '—';
    tr.querySelector(`#mtr-sent-${data.hop}`).textContent  = fmt(data.sent);
    tr.querySelector(`#mtr-recv-${data.hop}`).textContent  = fmt(data.recv);
    tr.querySelector(`#mtr-last-${data.hop}`).textContent  = fmt(data.last);
    tr.querySelector(`#mtr-avg-${data.hop}`).textContent   = fmt(data.avg);
    tr.querySelector(`#mtr-best-${data.hop}`).textContent  = fmt(data.best);
    tr.querySelector(`#mtr-worst-${data.hop}`).textContent = fmt(data.worst);

    // Color-code by loss%
    tr.style.color = '';
    if (data.loss >= 50) {
      tr.style.color = 'var(--text-error)';
    } else if (data.loss > 0) {
      tr.style.color = 'var(--text-warning)';
    } else if (data.recv > 0) {
      tr.style.color = 'var(--text-success)';
    }
  }

  const statusEl = container.querySelector('#mtr-status');
  let totalHops = 0;

  container.querySelector('#mtr-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const host    = container.querySelector('#mtr-host').value.trim();
    const packets = parseInt(container.querySelector('#mtr-packets').value) || 50;
    if (!host) { showToast('Enter a host', 'warning'); return; }

    // Reset UI
    container.querySelector('#mtr-tbody').innerHTML = '';
    Object.keys(rowMap).forEach(k => delete rowMap[k]);
    progress.reset();
    statusEl.textContent = '';
    statusEl.style.color = '';
    totalHops = 0;

    const removeData = window.netAPI.mtr.onData((data) => {
      if (data.phase === 'discovery') {
        if (data.message) {
          statusEl.textContent = data.message;
        } else if (data.hop != null) {
          getOrCreateRow(data.hop, data.address);
          statusEl.textContent = `Discovering hops... found ${data.hop}`;
          progress.set(10, `Hop ${data.hop}`);
        }
      } else if (data.phase === 'pinging') {
        totalHops = data.total;
        statusEl.textContent = `Pinging ${data.total} hops (${data.packets} packets each)...`;
        progress.set(15, '');
      } else if (data.phase === 'stats') {
        updateRowStats(data);
        // Approximate progress: use the current hop's sent count as a proxy
        if (packets > 0) {
          const pct = Math.min(99, 15 + Math.round((data.sent / packets) * 84));
          progress.set(pct, data.address);
        }
      }
    });

    const removeResult = window.netAPI.mtr.onResult(({ hops, error }) => {
      removeData(); removeResult();
      progress.set(100, 'Complete');
      if (error) {
        statusEl.textContent = `Error: ${error}`;
        statusEl.style.color = 'var(--text-error)';
      } else {
        statusEl.textContent = `MTR complete — ${hops.length} hops`;
        statusEl.style.color = 'var(--text-success)';
        // Final update for all hops (fills in any hops that had no ping data)
        hops.forEach(h => {
          if (!rowMap[h.hop]) getOrCreateRow(h.hop, h.address);
          updateRowStats(h);
        });
        // Geo enrich all hops
        enrichMTRWithGeo(hops, container);
      }
    });

    try {
      await window.netAPI.mtr.run(host, packets);
    } catch (err) {
      removeData(); removeResult();
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.style.color = 'var(--text-error)';
    }
  });
}

// ── Bulk Ping Tab ─────────────────────────────────────────────────────
function buildBulkPingTab(container) {
  const progress = new ProgressBar();
  const table = new ResultsTable([
    { key: 'ip', label: 'IP Address' },
    { key: 'alive', label: 'Status', render: v => v
      ? '<span class="badge badge-green">UP</span>'
      : '<span class="badge badge-muted">DOWN</span>' },
    { key: 'rtt', label: 'RTT (ms)', render: v => v != null ? `${v}ms` : '—' },
  ]);

  container.innerHTML = `
    <div class="panel" style="margin-bottom:var(--space-md)">
      <p class="panel-title">Bulk Ping (CIDR Sweep)</p>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:12px">
        <div class="form-group" style="flex:1;margin:0">
          <label class="form-label">CIDR Range</label>
          <input class="form-input" id="fping-cidr" placeholder="192.168.1.0/24" value="192.168.1.0/24">
        </div>
        <button class="btn btn-primary" id="fping-run-btn">START SWEEP</button>
      </div>
      <div id="fping-progress-mount"></div>
      <div id="fping-summary" style="margin-top:8px;font-family:var(--font-mono);font-size:0.8rem;color:var(--text-secondary)"></div>
    </div>
    <div class="panel">
      <p class="panel-title">Results</p>
      <div id="fping-table-mount"></div>
    </div>
  `;

  container.querySelector('#fping-progress-mount').appendChild(progress.el);
  container.querySelector('#fping-table-mount').appendChild(table.el);

  container.querySelector('#fping-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const cidr = container.querySelector('#fping-cidr').value.trim();
    if (!cidr.includes('/')) { showToast('Enter CIDR format', 'warning'); return; }

    table.clear(); progress.reset();
    container.querySelector('#fping-summary').textContent = 'Scanning...';

    const removeProgress = window.netAPI.fping.onProgress(({ ip, alive, rtt, progress: pct, total, completed }) => {
      progress.set(pct, `${completed}/${total}`);
      if (alive) table.addRow({ ip, alive, rtt });
    });
    const removeResult = window.netAPI.fping.onResult(({ total, alive }) => {
      removeProgress(); removeResult();
      progress.set(100, 'Complete');
      container.querySelector('#fping-summary').textContent =
        `Scanned ${total} hosts — ${alive} UP / ${total - alive} DOWN`;
    });

    try {
      await window.netAPI.fping.run(cidr);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ── TCP Ping Tab ──────────────────────────────────────────────────────
function buildTCPPingTab(container) {
  const term = new TerminalOutput();

  container.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">TCP Ping</p>
        <div class="form-group">
          <label class="form-label">Host / IP</label>
          <input class="form-input" id="tcpping-host" placeholder="8.8.8.8" value="8.8.8.8">
        </div>
        <div class="form-group">
          <label class="form-label">Port</label>
          <input class="form-input" id="tcpping-port" type="number" value="80" min="1" max="65535">
        </div>
        <button class="btn btn-primary" id="tcpping-run-btn" style="width:100%">RUN TCP PING</button>
      </div>

      <div class="panel">
        <p class="panel-title">Results</p>
        <div class="grid-3" style="gap:8px;margin-bottom:12px">
          <div class="stat-card"><div class="stat-value" id="tcpping-min">—</div><div class="stat-label">Min ms</div></div>
          <div class="stat-card"><div class="stat-value" id="tcpping-avg">—</div><div class="stat-label">Avg ms</div></div>
          <div class="stat-card"><div class="stat-value" id="tcpping-max">—</div><div class="stat-label">Max ms</div></div>
        </div>
        <div id="tcpping-term-mount"></div>
      </div>
    </div>
  `;

  container.querySelector('#tcpping-term-mount').appendChild(term.el);

  container.querySelector('#tcpping-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const host = container.querySelector('#tcpping-host').value.trim();
    const port = parseInt(container.querySelector('#tcpping-port').value) || 80;
    if (!host) { showToast('Enter a host', 'warning'); return; }

    term.clear();
    term.append(`TCP Ping ${host}:${port}...`, 'muted');

    const removeResult = window.netAPI.tcpping.onResult((result) => {
      removeResult();
      result.probes.forEach(p => {
        term.append(p.message, p.success ? 'success' : 'error');
      });
      container.querySelector('#tcpping-min').textContent = result.min ?? '—';
      container.querySelector('#tcpping-avg').textContent = result.avg ?? '—';
      container.querySelector('#tcpping-max').textContent = result.max ?? '—';
    });

    try {
      await window.netAPI.tcpping.run(host, port);
    } catch (err) {
      term.append(`Error: ${err.message}`, 'error');
    }
  });
}

// ── HTTP / DNS Tab ────────────────────────────────────────────────────
function buildHTTPDNSTab(container) {
  const term = new TerminalOutput();

  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-subtab="http">HTTP Request</button>
      <button class="tab-btn" data-subtab="dns">DNS Lookup</button>
    </div>

    <div class="sub-panel active" id="subtab-http">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">HTTP Request</p>
          <div class="form-group">
            <label class="form-label">URL</label>
            <input class="form-input" id="http-url" placeholder="https://example.com" value="https://example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Method</label>
            <select class="form-select" id="http-method">
              <option>GET</option><option>HEAD</option><option>POST</option>
            </select>
          </div>
          <button class="btn btn-primary" id="http-run-btn" style="width:100%">SEND REQUEST</button>
        </div>

        <div class="panel">
          <p class="panel-title">Response</p>
          <div id="http-result"></div>
        </div>
      </div>
    </div>

    <div class="sub-panel" id="subtab-dns" style="display:none">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">DNS Lookup</p>
          <div class="form-group">
            <label class="form-label">Hostname</label>
            <input class="form-input" id="dns-host" placeholder="example.com" value="example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Record Type</label>
            <select class="form-select" id="dns-type">
              <option>A</option><option>AAAA</option><option>MX</option>
              <option>TXT</option><option>NS</option><option>CNAME</option>
              <option>PTR</option><option>SOA</option>
            </select>
          </div>
          <button class="btn btn-primary" id="dns-run-btn" style="width:100%">LOOKUP</button>
        </div>

        <div class="panel">
          <p class="panel-title">Records</p>
          <div id="dns-result"></div>
        </div>
      </div>
    </div>
  `;

  // Sub-tabs
  container.querySelectorAll('[data-subtab]').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('[data-subtab]').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.sub-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      container.querySelector(`#subtab-${tab.dataset.subtab}`).style.display = '';
    });
  });

  // HTTP
  container.querySelector('#http-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container.querySelector('#http-result')); return; }
    const url = container.querySelector('#http-url').value.trim();
    const method = container.querySelector('#http-method').value;
    if (!url) { showToast('Enter a URL', 'warning'); return; }

    const resultEl = container.querySelector('#http-result');
    resultEl.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';

    try {
      const r = await window.netAPI.http.request(url, method);
      resultEl.innerHTML = `
        <table class="data-table">
          <tbody>
            <tr><td style="color:var(--text-secondary)">Status</td><td><span class="badge ${r.status < 400 ? 'badge-green' : 'badge-red'}">${r.status} ${r.statusText}</span></td></tr>
            <tr><td style="color:var(--text-secondary)">Timing</td><td>${r.timing}ms</td></tr>
            <tr><td style="color:var(--text-secondary)">Size</td><td>${(r.size / 1024).toFixed(2)} KB</td></tr>
            <tr><td style="color:var(--text-secondary)">Content-Type</td><td>${r.headers['content-type'] || '—'}</td></tr>
          </tbody>
        </table>
        <div class="terminal" style="margin-top:8px;max-height:150px;user-select:text">${escapeHTML(r.body)}</div>
      `;
    } catch (err) {
      container.querySelector('#http-result').innerHTML = `<p style="color:var(--text-error)">${err.message}</p>`;
    }
  });

  // DNS
  container.querySelector('#dns-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container.querySelector('#dns-result')); return; }
    const host = container.querySelector('#dns-host').value.trim();
    const type = container.querySelector('#dns-type').value;
    if (!host) { showToast('Enter a hostname', 'warning'); return; }

    const resultEl = container.querySelector('#dns-result');
    resultEl.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';

    try {
      const r = await window.netAPI.dns.query(host, type);
      const records = Array.isArray(r.records) ? r.records : [r.records];
      resultEl.innerHTML = `
        <div style="margin-bottom:8px;font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)">
          ${type} records for ${host} — ${r.timing}ms
        </div>
        <div class="terminal" style="user-select:text">${records.map(rec =>
          typeof rec === 'object' ? JSON.stringify(rec, null, 2) : String(rec)
        ).join('\n')}</div>
        ${r.error ? `<p style="color:var(--text-error);margin-top:8px">${r.error}</p>` : ''}
      `;
    } catch (err) {
      container.querySelector('#dns-result').innerHTML = `<p style="color:var(--text-error)">${err.message}</p>`;
    }
  });
}

// ── iPerf3 Tab ────────────────────────────────────────────────────────
function buildIperfTab(container) {
  const term = new TerminalOutput();

  container.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" data-subtab="iperf-client">Client</button>
      <button class="tab-btn" data-subtab="iperf-server">Server</button>
    </div>

    <div class="sub-panel active" id="subtab-iperf-client">
      <div class="grid-2">
        <div class="panel">
          <p class="panel-title">iPerf3 Client</p>
          <div class="form-group">
            <label class="form-label">Server Host</label>
            <input class="form-input" id="iperf-host" placeholder="192.168.1.1">
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input class="form-input" id="iperf-port" type="number" value="5201" min="1" max="65535">
          </div>
          <div class="form-group">
            <label class="form-label">Duration (seconds)</label>
            <input class="form-input" id="iperf-duration" type="number" value="10" min="1" max="300">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-success" id="iperf-start-btn" style="flex:1">START TEST</button>
            <button class="btn btn-danger" id="iperf-stop-btn" style="flex:1" disabled>STOP</button>
          </div>
        </div>

        <div class="panel">
          <p class="panel-title">Results</p>
          <div class="grid-2" style="gap:8px;margin-bottom:12px">
            <div class="stat-card"><div class="stat-value" id="iperf-tx">—</div><div class="stat-label">TX Mbps</div></div>
            <div class="stat-card"><div class="stat-value" id="iperf-rx">—</div><div class="stat-label">RX Mbps</div></div>
          </div>
          <div id="iperf-term-mount"></div>
        </div>
      </div>
    </div>

    <div class="sub-panel" id="subtab-iperf-server" style="display:none">
      <div class="panel" style="max-width:400px">
        <p class="panel-title">iPerf3 Server</p>
        <div class="form-group">
          <label class="form-label">Listen Port</label>
          <input class="form-input" id="iperf-srv-port" type="number" value="5201" min="1" max="65535">
        </div>
        <button class="btn btn-success" id="iperf-srv-start-btn" style="width:100%">START SERVER</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-subtab]').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('[data-subtab]').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.sub-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      container.querySelector(`#subtab-${tab.dataset.subtab}`).style.display = '';
    });
  });

  container.querySelector('#iperf-term-mount').appendChild(term.el);
  const startBtn = container.querySelector('#iperf-start-btn');
  const stopBtn  = container.querySelector('#iperf-stop-btn');

  startBtn.addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const host = container.querySelector('#iperf-host').value.trim();
    const port = parseInt(container.querySelector('#iperf-port').value) || 5201;
    const dur  = parseInt(container.querySelector('#iperf-duration').value) || 10;
    if (!host) { showToast('Enter server host', 'warning'); return; }

    term.clear();
    startBtn.disabled = true; stopBtn.disabled = false;

    const removeData = window.netAPI.iperf.onData(({ line }) => term.append(line));
    const removeResult = window.netAPI.iperf.onResult((result) => {
      removeData(); removeResult();
      startBtn.disabled = false; stopBtn.disabled = true;
      if (result.success) {
        const tx = (result.data.bitsPerSecSent / 1e6).toFixed(2);
        const rx = (result.data.bitsPerSecReceived / 1e6).toFixed(2);
        container.querySelector('#iperf-tx').textContent = tx;
        container.querySelector('#iperf-rx').textContent = rx;
      } else {
        term.append('Failed to parse iPerf3 output', 'error');
      }
    });

    try {
      await window.netAPI.iperf.startClient(host, port, dur);
    } catch (err) {
      term.append(`Error: ${err.message}`, 'error');
      startBtn.disabled = false; stopBtn.disabled = true;
    }
  });

  stopBtn.addEventListener('click', async () => {
    if (!hasAPI()) return;
    try { await window.netAPI.iperf.stop(); } catch {}
    startBtn.disabled = false; stopBtn.disabled = true;
  });

  container.querySelector('#iperf-srv-start-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const port = parseInt(container.querySelector('#iperf-srv-port').value) || 5201;
    try {
      await window.netAPI.iperf.startServer(port);
      showToast(`iPerf3 server started on port ${port}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ── MTR Geo Enrichment ────────────────────────────────────────────────
async function enrichMTRWithGeo(hops, container) {
  if (!hasAPI() || !window.netAPI.geo) return;
  const validHops = hops.filter(h => h.address && h.address !== '*');
  if (validHops.length === 0) return;

  try {
    const results = await window.netAPI.geo.batch(validHops.map(h => h.address));
    if (!Array.isArray(results)) return;

    const geoMap = {};
    results.forEach(g => { if (g && g.query) geoMap[g.query] = g; });

    validHops.forEach(h => {
      const cell = container.querySelector(`#mtr-loc-${h.hop}`);
      if (!cell) return;
      const g = geoMap[h.address];
      if (!g || g.status !== 'success') {
        cell.textContent = g?.message === 'private range' ? 'Private' : '—';
      } else {
        const flag = countryFlag(g.countryCode);
        cell.textContent = `${flag} ${g.city}, ${g.countryCode}`;
        cell.title = `${g.country} · ${g.isp} · ${g.as}`;
        cell.style.color = 'var(--text-secondary)';
      }
    });
  } catch { /* silently ignore geo errors */ }
}

// ── IP Lookup Tab ─────────────────────────────────────────────────────
function buildIPLookupTab(container) {
  container.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">IP Geolocation</p>
        <div class="form-group">
          <label class="form-label">IP Address or Hostname</label>
          <input class="form-input" id="geo-ip" placeholder="8.8.8.8" value="8.8.8.8">
        </div>
        <button class="btn btn-primary" id="geo-run-btn" style="width:100%">LOOKUP</button>
        <p style="margin-top:10px;font-size:0.72rem;color:var(--text-muted)">
          Powered by ip-api.com · Requires internet
        </p>
      </div>

      <div class="panel" id="geo-result-panel">
        <p class="panel-title">Result</p>
        <div id="geo-result" style="color:var(--text-muted);font-size:0.85rem">
          Enter an IP or hostname and click Lookup.
        </div>
      </div>
    </div>
  `;

  container.querySelector('#geo-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const ip = container.querySelector('#geo-ip').value.trim();
    if (!ip) { showToast('Enter an IP or hostname', 'warning'); return; }

    const resultEl = container.querySelector('#geo-result');
    resultEl.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';

    try {
      const g = await window.netAPI.geo.lookup(ip);

      if (!g || g.status !== 'success') {
        const msg = g?.message || 'Unknown error';
        resultEl.innerHTML = `<p style="color:var(--text-error)">${escapeHTML(msg === 'private range' ? 'Private/reserved IP range' : `Lookup failed: ${msg}`)}</p>`;
        return;
      }

      const flag = countryFlag(g.countryCode);
      resultEl.innerHTML = `
        <table class="data-table">
          <tbody>
            <tr>
              <td style="color:var(--text-muted)">IP</td>
              <td style="font-family:var(--font-mono)">${escapeHTML(g.query)}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">Country</td>
              <td>${flag} ${escapeHTML(g.country)} <span style="color:var(--text-muted)">(${escapeHTML(g.countryCode)})</span></td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">Region</td>
              <td>${escapeHTML(g.regionName || '—')}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">City</td>
              <td>${escapeHTML(g.city || '—')}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">ISP</td>
              <td>${escapeHTML(g.isp || '—')}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">Organization</td>
              <td>${escapeHTML(g.org || '—')}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">ASN</td>
              <td style="font-family:var(--font-mono)">${escapeHTML(g.as || '—')}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">Coordinates</td>
              <td style="font-family:var(--font-mono)">${g.lat}, ${g.lon}</td>
            </tr>
            <tr>
              <td style="color:var(--text-muted)">Timezone</td>
              <td>${escapeHTML(g.timezone || '—')}</td>
            </tr>
          </tbody>
        </table>
      `;
    } catch (err) {
      resultEl.innerHTML = `<p style="color:var(--text-error)">${escapeHTML(err.message)}</p>`;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
