/**
 * Toast notification system.
 */

let toastContainer = null;

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
  }
  return toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} [duration=4000]
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = getContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 250ms ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
