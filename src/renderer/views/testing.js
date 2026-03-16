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
      <button class="tab-btn" data-tab="traceroute">Traceroute</button>
      <button class="tab-btn" data-tab="bulk-ping">Bulk Ping</button>
      <button class="tab-btn" data-tab="tcp-ping">TCP Ping</button>
      <button class="tab-btn" data-tab="capture">Capture</button>
      <button class="tab-btn" data-tab="http-dns">HTTP / DNS</button>
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

    <!-- Capture -->
    <div class="tab-panel" id="tab-capture"></div>

    <!-- HTTP / DNS -->
    <div class="tab-panel" id="tab-http-dns"></div>

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
  buildTracerouteTab(el.querySelector('#tab-traceroute'));
  buildBulkPingTab(el.querySelector('#tab-bulk-ping'));
  buildTCPPingTab(el.querySelector('#tab-tcp-ping'));
  buildCaptureTab(el.querySelector('#tab-capture'));
  buildHTTPDNSTab(el.querySelector('#tab-http-dns'));
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

// ── Traceroute Tab ────────────────────────────────────────────────────
function buildTracerouteTab(container) {
  const term = new TerminalOutput();
  const table = new ResultsTable([
    { key: 'hop', label: 'Hop' },
    { key: 'address', label: 'Address' },
    { key: 'avg', label: 'Avg ms', render: v => v != null ? `${v}` : '*' },
  ]);

  container.innerHTML = `
    <div class="panel" style="margin-bottom:var(--space-md)">
      <p class="panel-title">Traceroute</p>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div class="form-group" style="flex:1;margin:0">
          <label class="form-label">Host / IP</label>
          <input class="form-input" id="tr-host" placeholder="8.8.8.8" value="8.8.8.8">
        </div>
        <button class="btn btn-primary" id="tr-run-btn">RUN TRACEROUTE</button>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <p class="panel-title">Hops Table</p>
        <div id="tr-table-mount"></div>
      </div>
      <div class="panel">
        <p class="panel-title">Raw Output</p>
        <div id="tr-terminal-mount"></div>
      </div>
    </div>
  `;

  container.querySelector('#tr-terminal-mount').appendChild(term.el);
  container.querySelector('#tr-table-mount').appendChild(table.el);

  container.querySelector('#tr-run-btn').addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const host = container.querySelector('#tr-host').value.trim();
    if (!host) { showToast('Enter a host', 'warning'); return; }

    term.clear(); table.clear();
    term.append(`Traceroute to ${host}...`, 'muted');

    const removeData = window.netAPI.traceroute.onData(({ hop, line, error }) => {
      term.append(line, error ? 'error' : 'default');
      if (hop) table.addRow(hop);
    });
    const removeResult = window.netAPI.traceroute.onResult(({ hops }) => {
      removeData(); removeResult();
      term.append(`\nTrace complete. ${hops.length} hops.`, 'muted');
    });

    try {
      await window.netAPI.traceroute.run(host);
    } catch (err) {
      term.append(`Error: ${err.message}`, 'error');
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

// ── Capture Tab ───────────────────────────────────────────────────────
function buildCaptureTab(container) {
  const term = new TerminalOutput();
  let capturing = false;

  container.innerHTML = `
    <div class="panel" style="margin-bottom:var(--space-md)">
      <p class="panel-title">Packet Capture</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:120px;margin:0">
          <label class="form-label">Interface</label>
          <input class="form-input" id="cap-iface" placeholder="eth0" value="eth0">
        </div>
        <div class="form-group" style="flex:2;min-width:180px;margin:0">
          <label class="form-label">BPF Filter (optional)</label>
          <input class="form-input" id="cap-filter" placeholder="tcp port 80">
        </div>
        <button class="btn btn-success" id="cap-start-btn">START</button>
        <button class="btn btn-danger" id="cap-stop-btn" disabled>STOP</button>
      </div>
      <div id="cap-status" style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono)"></div>
    </div>
    <div class="panel">
      <p class="panel-title">Captured Packets</p>
      <div id="cap-term-mount"></div>
    </div>
  `;

  container.querySelector('#cap-term-mount').appendChild(term.el);
  const startBtn = container.querySelector('#cap-start-btn');
  const stopBtn = container.querySelector('#cap-stop-btn');
  const statusEl = container.querySelector('#cap-status');

  startBtn.addEventListener('click', async () => {
    if (!hasAPI()) { noAPIMsg(container); return; }
    const iface = container.querySelector('#cap-iface').value.trim();
    const filter = container.querySelector('#cap-filter').value.trim();
    if (!iface) { showToast('Enter interface name', 'warning'); return; }

    term.clear();
    capturing = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = '● Capturing...';

    const removeData = window.netAPI.tcpdump.onData(({ line, error }) => {
      term.append(line, error ? 'warning' : 'default');
    });
    const removeStopped = window.netAPI.tcpdump.onStopped(({ pcapPath }) => {
      removeData(); removeStopped();
      capturing = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = `● Capture saved: ${pcapPath}`;
      showToast('Capture stopped', 'info');
    });

    try {
      const result = await window.netAPI.tcpdump.start(iface, filter);
      statusEl.textContent = `● Capturing on ${iface} → ${result.pcapPath}`;
    } catch (err) {
      capturing = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = '';
      term.append(`Error: ${err.message}`, 'error');
    }
  });

  stopBtn.addEventListener('click', async () => {
    if (!hasAPI()) return;
    try { await window.netAPI.tcpdump.stop(); } catch (err) { showToast(err.message, 'error'); }
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

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
