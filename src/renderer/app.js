/**
 * Net Architect — App entry point.
 * Initializes the router, hamburger menu, and app-level state.
 */

import { startRouter } from './router.js';
import { showToast } from './components/notification.js';

// ── Hamburger Menu ─────────────────────────────────────────────────────
function initHamburger() {
  const btn = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (!btn || !sidebar) return;

  const isMobile = () => window.innerWidth <= 768;

  btn.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('visible');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('visible');
  });

  // Close sidebar on nav click (mobile)
  document.getElementById('main-nav')?.addEventListener('click', (e) => {
    if (e.target.closest('.nav-link') && isMobile()) {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('visible');
    }
  });

  // Handle resize
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('visible');
    }
  });
}

// ── App Version ────────────────────────────────────────────────────────
async function initAppInfo() {
  try {
    const version = await window.netAPI.app.getVersion();
    const platform = await window.netAPI.app.getPlatform();

    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = version;

    const platformEl = document.getElementById('topbar-platform');
    if (platformEl) platformEl.textContent = platform.toUpperCase();
  } catch {
    // Running without Electron (dev browser) — silently ignore
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────
async function boot() {
  initHamburger();
  await initAppInfo();
  startRouter();
}

boot().catch(err => {
  console.error('Boot failed:', err);
  showToast('Failed to initialize application', 'error');
});
