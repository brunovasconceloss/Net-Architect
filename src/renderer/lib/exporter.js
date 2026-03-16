/**
 * Data exporter — converts result sets to various formats and triggers downloads.
 */

/**
 * Convert an array of objects to CSV.
 * @param {Array<Object>} data
 * @returns {string}
 */
export function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] == null ? '' : String(row[h]);
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Convert to plain text (aligned columns).
 * @param {Array<Object>} data
 * @returns {string}
 */
export function toTXT(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const colWidths = headers.map(h =>
    Math.max(h.length, ...data.map(r => String(r[h] ?? '').length))
  );

  const sep = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const header = headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('│');
  const rows = data.map(row =>
    headers.map((h, i) => ` ${String(row[h] ?? '').padEnd(colWidths[i])} `).join('│')
  );

  return ['┌' + sep.replace(/┼/g, '┬') + '┐',
    '│' + header + '│',
    '├' + sep + '┤',
    ...rows.map(r => '│' + r + '│'),
    '└' + sep.replace(/┼/g, '┴') + '┘',
  ].join('\n');
}

/**
 * Convert to GitHub-flavored Markdown table.
 * @param {Array<Object>} data
 * @returns {string}
 */
export function toMarkdown(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const header = '| ' + headers.join(' | ') + ' |';
  const sep    = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const rows   = data.map(row => '| ' + headers.map(h => String(row[h] ?? '')).join(' | ') + ' |');
  return [header, sep, ...rows].join('\n');
}

/**
 * Trigger a file download in the renderer.
 * @param {string} content
 * @param {string} filename
 * @param {string} [mime='text/plain']
 */
export function downloadFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
