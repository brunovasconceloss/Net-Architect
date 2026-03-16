/**
 * Architecture view — Network Visualizer (ASCII + SVG tree from VLSM data).
 */

import { parseIPv4 } from '../lib/ipv4.js';
import { calculateVLSM } from '../lib/vlsm.js';
import { generateASCII, generateSVG } from '../lib/visualizer.js';
import { createCopyButton } from '../components/copy-button.js';
import { showToast } from '../components/notification.js';

export function render() {
  const el = document.createElement('div');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">// ARCHITECTURE</h1>
      <p class="page-subtitle">Network Topology Visualizer</p>
    </div>

    <div class="grid-2" style="margin-bottom:var(--space-lg)">
      <div class="panel">
        <p class="panel-title">Topology Input</p>
        <div class="form-group">
          <label class="form-label">Base Network (CIDR)</label>
          <input class="form-input" id="arch-base" placeholder="192.168.0.0/20" value="192.168.0.0/20">
        </div>
        <p class="form-label" style="margin-bottom:8px">Segments (one per line: Name,Hosts)</p>
        <textarea class="form-input" id="arch-segments" rows="6" style="resize:vertical;user-select:text" placeholder="LAN-A,50&#10;LAN-B,25&#10;Management,10&#10;WAN-Link,2">LAN-A,50
LAN-B,25
Management,10
WAN-Link,2</textarea>
        <button class="btn btn-primary" id="arch-gen-btn" style="width:100%;margin-top:12px">GENERATE TOPOLOGY</button>
      </div>

      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <p class="panel-title" style="margin:0">Topology View</p>
          <div style="display:flex;gap:8px">
            <button class="tab-btn active" id="view-ascii-btn" style="padding:4px 10px;font-size:0.72rem">ASCII</button>
            <button class="tab-btn" id="view-svg-btn" style="padding:4px 10px;font-size:0.72rem">SVG</button>
            <div id="arch-copy-area"></div>
          </div>
        </div>
        <div id="arch-ascii-view" class="terminal" style="min-height:220px;white-space:pre;"></div>
        <div id="arch-svg-view" style="display:none;"></div>
      </div>
    </div>
  `;

  const baseInput = el.querySelector('#arch-base');
  const segmentsInput = el.querySelector('#arch-segments');
  const genBtn = el.querySelector('#arch-gen-btn');
  const asciiView = el.querySelector('#arch-ascii-view');
  const svgView = el.querySelector('#arch-svg-view');
  const copyArea = el.querySelector('#arch-copy-area');
  const asciiBtn = el.querySelector('#view-ascii-btn');
  const svgBtn = el.querySelector('#view-svg-btn');

  let currentASCII = '';

  // Tab switch
  asciiBtn.addEventListener('click', () => {
    asciiBtn.classList.add('active'); svgBtn.classList.remove('active');
    asciiView.style.display = ''; svgView.style.display = 'none';
  });
  svgBtn.addEventListener('click', () => {
    svgBtn.classList.add('active'); asciiBtn.classList.remove('active');
    svgView.style.display = ''; asciiView.style.display = 'none';
  });

  genBtn.addEventListener('click', () => {
    const base = baseInput.value.trim();
    if (!base.includes('/')) { showToast('Enter base network in CIDR format', 'warning'); return; }

    const lines = segmentsInput.value.trim().split('\n').filter(Boolean);
    const segments = [];
    for (const line of lines) {
      const [name, hostsStr] = line.split(',').map(s => s.trim());
      const hosts = parseInt(hostsStr);
      if (!name || !hosts || hosts < 1) { showToast(`Invalid segment line: "${line}"`, 'error'); return; }
      segments.push({ name, hosts });
    }

    if (segments.length === 0) { showToast('Add at least one segment', 'warning'); return; }

    try {
      const baseInfo = parseIPv4(base);
      const result = calculateVLSM(base, segments);

      // Attach offset info for SVG coloring
      let offset = 0;
      result.allocations.forEach(a => {
        if (!a.error) {
          a._offset = offset;
          offset += a.totalHosts;
        }
      });

      currentASCII = generateASCII({ baseNetwork: base, allocations: result.allocations });
      asciiView.textContent = currentASCII;

      const svgStr = generateSVG({ baseNetwork: base, allocations: result.allocations, baseInfo });
      svgView.innerHTML = svgStr;

      // Copy button for ASCII
      copyArea.innerHTML = '';
      copyArea.appendChild(createCopyButton(() => currentASCII, 'Copy'));

      if (result.error) showToast(result.error, 'warning');
      else showToast('Topology generated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Auto-generate on load
  setTimeout(() => genBtn.click(), 0);

  return el;
}
