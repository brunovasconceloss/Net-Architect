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

// ── Public IP ──────────────────────────────────────────────────────────
async function fetchPublicIP() {
  const APIS = [
    { url: 'https://api.ipify.org?format=json', parse: d => d.ip },
    { url: 'https://api4.my-ip.io/ip.json',     parse: d => d.ip },
    { url: 'https://ipv4.icanhazip.com',         parse: d => d.trim() },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  for (const api of APIS) {
    try {
      const res = await fetch(api.url, { signal: controller.signal });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json') ? await res.json() : await res.text();
      const ip = api.parse(data);
      if (ip && /^[\d.]+$/.test(ip)) {
        clearTimeout(timeout);
        return ip;
      }
    } catch {
      // try next
    }
  }
  clearTimeout(timeout);
  return null;
}

async function initPublicIP() {
  const container = document.getElementById('topbar-public-ip');
  const valueEl   = document.getElementById('topbar-ip-value');
  if (!container || !valueEl) return;

  const ip = await fetchPublicIP();

  if (!ip) {
    valueEl.textContent = 'offline';
    container.classList.add('error');
    container.title = 'Could not determine public IP';
    return;
  }

  valueEl.textContent = ip;
  container.title = `Public IP: ${ip} — click to copy`;

  container.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ip);
      container.classList.add('copied');
      valueEl.textContent = 'copied!';
      setTimeout(() => {
        container.classList.remove('copied');
        valueEl.textContent = ip;
      }, 1500);
    } catch {
      // clipboard not available
    }
  });
}

// ── Bootstrap ──────────────────────────────────────────────────────────
async function boot() {
  initHamburger();
  await initAppInfo();
  startRouter();
  initPublicIP(); // non-blocking — runs after UI is ready
}

boot().catch(err => {
  console.error('Boot failed:', err);
  showToast('Failed to initialize application', 'error');
});
