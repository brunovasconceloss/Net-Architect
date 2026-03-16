/**
 * Export dropdown menu component.
 */

import { showToast } from './notification.js';
import { toCSV, toTXT, toMarkdown, downloadFile } from '../lib/exporter.js';

/**
 * Create an export menu button.
 * @param {{ getData: () => any, filename: string }} options
 * @returns {HTMLElement}
 */
export function createExportMenu({ getData, filename }) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';

  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost';
  btn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Export
  `;

  const menu = document.createElement('div');
  menu.style.cssText = `
    display:none;position:absolute;right:0;top:100%;margin-top:4px;
    background:var(--bg-panel);border:1px solid var(--border-normal);
    border-radius:var(--radius-md);min-width:140px;z-index:var(--z-overlay);
    box-shadow:0 8px 24px rgba(0,0,0,0.4);overflow:hidden;
  `;

  const formats = [
    { label: 'Export as CSV', ext: 'csv', fn: toCSV },
    { label: 'Export as TXT', ext: 'txt', fn: toTXT },
    { label: 'Export as MD', ext: 'md', fn: toMarkdown },
  ];

  formats.forEach(({ label, ext, fn }) => {
    const item = document.createElement('button');
    item.textContent = label;
    item.style.cssText = `
      display:block;width:100%;text-align:left;padding:8px 14px;
      font-size:0.8rem;color:var(--text-secondary);background:none;border:none;
      cursor:pointer;transition:color 150ms,background 150ms;
    `;
    item.addEventListener('mouseover', () => {
      item.style.background = 'rgba(6,182,212,0.08)';
      item.style.color = 'var(--cyan-bright)';
    });
    item.addEventListener('mouseout', () => {
      item.style.background = '';
      item.style.color = '';
    });
    item.addEventListener('click', () => {
      const data = getData();
      if (!data) { showToast('No data to export', 'warning'); return; }
      const content = fn(data);
      downloadFile(content, `${filename}.${ext}`);
      menu.style.display = 'none';
    });
    menu.appendChild(item);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => { menu.style.display = 'none'; });

  wrapper.appendChild(btn);
  wrapper.appendChild(menu);
  return wrapper;
}
