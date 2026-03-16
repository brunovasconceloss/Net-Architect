/**
 * Network topology visualizer — generates ASCII and SVG trees from VLSM allocations.
 */

/**
 * Generate an ASCII tree representation of VLSM allocations.
 * @param {{ baseNetwork: string, allocations: Array }} result
 * @returns {string}
 */
export function generateASCII(result) {
  const { baseNetwork, allocations } = result;
  const lines = [];

  lines.push(`NETWORK: ${baseNetwork}`);
  lines.push('│');

  allocations.forEach((alloc, idx) => {
    const isLast = idx === allocations.length - 1;
    const connector = isLast ? '└──' : '├──';
    const indent    = isLast ? '    ' : '│   ';

    if (alloc.error) {
      lines.push(`${connector} [ERROR] ${alloc.name}: ${alloc.error}`);
      return;
    }

    lines.push(`${connector} ${alloc.cidr}  ← ${alloc.name}`);
    lines.push(`${indent} ├── Network  : ${alloc.network}`);
    lines.push(`${indent} ├── Mask     : ${alloc.subnetMask}`);
    lines.push(`${indent} ├── Hosts    : ${alloc.firstHost} – ${alloc.lastHost}`);
    lines.push(`${indent} ├── Usable   : ${alloc.usableHosts.toLocaleString()}`);
    lines.push(`${indent} └── Broadcast: ${alloc.broadcast}`);
    if (!isLast) lines.push('│');
  });

  return lines.join('\n');
}

/**
 * Generate an SVG diagram of VLSM allocations as a proportional address-space bar.
 * @param {{ baseNetwork: string, allocations: Array, baseInfo: Object }} result
 * @returns {string} SVG string
 */
export function generateSVG(result) {
  const { baseNetwork, allocations, baseInfo } = result;
  if (!baseInfo) return '<svg xmlns="http://www.w3.org/2000/svg"><text fill="#94a3b8" y="20" x="10" font-size="12">No data</text></svg>';

  const COLORS = [
    '#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444',
    '#22d3ee','#34d399','#a78bfa','#fcd34d','#f87171',
    '#0891b2','#059669','#7c3aed','#d97706','#dc2626',
  ];

  const W = 700, BARH = 36, PAD = 16, LABEL_H = 20;
  const totalHosts = baseInfo.totalHosts;
  const rows = allocations.filter(a => !a.error);

  const bars = rows.map((alloc, i) => {
    const xFrac = (alloc._offset || 0) / totalHosts;
    const wFrac = alloc.totalHosts / totalHosts;
    return { alloc, x: xFrac * (W - PAD * 2), w: Math.max(2, wFrac * (W - PAD * 2)), color: COLORS[i % COLORS.length] };
  });

  const svgH = PAD * 2 + BARH + LABEL_H * rows.length + PAD;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${svgH}" viewBox="0 0 ${W} ${svgH}">`;
  svg += `<rect width="${W}" height="${svgH}" fill="#060d14" rx="8"/>`;

  // Title
  svg += `<text x="${PAD}" y="20" fill="#22d3ee" font-family="monospace" font-size="12" font-weight="bold">NETWORK: ${baseNetwork}</text>`;

  // Bar track
  svg += `<rect x="${PAD}" y="28" width="${W - PAD * 2}" height="${BARH}" fill="#0a1520" rx="4" stroke="#1e3a4a" stroke-width="1"/>`;

  // Segments
  bars.forEach(({ alloc, x, w, color }) => {
    svg += `<rect x="${PAD + x}" y="28" width="${w}" height="${BARH}" fill="${color}" opacity="0.7" rx="2"/>`;
    if (w > 20) {
      svg += `<text x="${PAD + x + w / 2}" y="50" fill="#020408" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">${alloc.name.slice(0, Math.floor(w / 7))}</text>`;
    }
  });

  // Legend
  rows.forEach((alloc, i) => {
    const y = 28 + BARH + PAD + i * LABEL_H;
    const color = COLORS[i % COLORS.length];
    svg += `<rect x="${PAD}" y="${y - 10}" width="12" height="12" fill="${color}" opacity="0.8" rx="2"/>`;
    svg += `<text x="${PAD + 18}" y="${y}" fill="#e0f7fa" font-family="monospace" font-size="11">${alloc.cidr}  ${alloc.name}  (${alloc.usableHosts} hosts)</text>`;
  });

  svg += '</svg>';
  return svg;
}
