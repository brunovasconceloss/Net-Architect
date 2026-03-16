/**
 * Hash-based SPA router.
 * Routes map to async view loaders.
 */

const routes = {
  '#planning':     () => import('./views/planning.js'),
  '#architecture': () => import('./views/architecture.js'),
  '#tools':        () => import('./views/tools.js'),
  '#testing':      () => import('./views/testing.js'),
  '#about':        () => import('./views/about.js'),
};

const DEFAULT_ROUTE = '#planning';

let currentRoute = null;

/**
 * Navigate to a route and render its view.
 * @param {string} hash - e.g. "#planning"
 */
export async function navigate(hash) {
  const route = routes[hash] || routes[DEFAULT_ROUTE];
  const resolvedHash = routes[hash] ? hash : DEFAULT_ROUTE;

  if (resolvedHash === currentRoute) return;
  currentRoute = resolvedHash;

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === resolvedHash);
  });

  // Update topbar title
  const titles = {
    '#planning':     'PLANNING — Subnet Calculator & VLSM',
    '#architecture': 'ARCHITECTURE — Network Visualizer',
    '#tools':        'TOOLS — Config Generator & Export',
    '#testing':      'TESTING — Network Diagnostics',
    '#about':        'ABOUT — Net Architect',
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[resolvedHash] || 'NET ARCHITECT';

  // Render view
  const container = document.getElementById('view-container');
  if (!container) return;

  try {
    const mod = await route();
    container.innerHTML = '';
    const el = await mod.render();
    el.classList.add('view-enter');
    container.appendChild(el);
    if (typeof mod.afterMount === 'function') mod.afterMount(el);
  } catch (err) {
    container.innerHTML = `
      <div class="panel" style="margin:32px auto;max-width:480px;text-align:center;">
        <p class="panel-title" style="justify-content:center;color:var(--text-error)">VIEW ERROR</p>
        <p style="color:var(--text-secondary);margin-top:8px;">${err.message}</p>
      </div>`;
  }
}

/**
 * Start the router — listen to hashchange and navigate to current hash.
 */
export function startRouter() {
  window.addEventListener('hashchange', () => navigate(location.hash));
  navigate(location.hash || DEFAULT_ROUTE);
}
