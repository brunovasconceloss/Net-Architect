/**
 * Copy-to-clipboard button component.
 */

import { showToast } from './notification.js';

/**
 * Create a copy button that copies text to clipboard.
 * @param {() => string} getTextFn - function returning text to copy
 * @param {string} [label='Copy']
 * @returns {HTMLButtonElement}
 */
export function createCopyButton(getTextFn, label = 'Copy') {
  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost';
  btn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    ${label}
  `;

  btn.addEventListener('click', async () => {
    const text = getTextFn();
    if (!text) {
      showToast('Nothing to copy', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
      btn.style.color = 'var(--text-success)';
      setTimeout(() => { btn.style.color = ''; }, 1500);
    } catch {
      showToast('Copy failed', 'error');
    }
  });

  return btn;
}
