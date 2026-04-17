# Net Architect — CLAUDE.md

> Auto-updated with each feature commit.

## Project Overview
**Net Architect** is a desktop Electron application for network engineers and administrators.
Tagline: *"The Network Engineer's Partner"*

Unified offline tool combining:
- IPv4/IPv6 subnet calculation + VLSM planning
- Network topology visualization (ASCII + SVG)
- Config generation (Cisco, Juniper, Huawei)
- Real OS-level network testing (ping, MTR, fping, TCP ping, HTTP, iPerf3)

**Repo:** https://github.com/brunovasconceloss/Net-Architect.git

---

## Tech Stack
- **Electron 28+** — main process calls OS tools via `child_process`
- **Vanilla JS ES2022** — no framework, no bundler; native ES modules in Chromium
- **CSS Custom Properties** — neutral charcoal dark theme (Linear/Vercel inspired)
- **electron-builder** — packages for Windows (.exe), macOS (.dmg), Linux (.AppImage)

---

## Security Model
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- `preload.js` exposes only named methods via `contextBridge`
- All IPC channels are hardcoded strings in preload — renderer cannot invoke arbitrary channels
- `security.js` validates/sanitizes all inputs before any `child_process.spawn()`
- CSP header via `session.webRequest.onHeadersReceived`

---

## Directory Structure
```
net_architect/
├── package.json
├── .gitignore
├── .eslintrc.json
├── CLAUDE.md
├── build/              ← app icons
├── src/
│   ├── main/
│   │   ├── main.js
│   │   ├── preload.js
│   │   ├── ipc-handlers.js
│   │   ├── security.js
│   │   └── tools/
│   │       ├── ping.js
│   │       ├── mtr.js
│   │       ├── fping.js
│   │       ├── tcpping.js
│   │       ├── http-tools.js
│   │       ├── iperf.js
│   │       └── geo.js
│   └── renderer/
│       ├── index.html
│       ├── app.js
│       ├── router.js
│       ├── styles/
│       │   ├── variables.css
│       │   ├── reset.css
│       │   ├── layout.css
│       │   ├── components.css
│       │   ├── animations.css
│       │   └── responsive.css
│       ├── components/
│       │   ├── terminal-output.js
│       │   ├── results-table.js
│       │   ├── copy-button.js
│       │   ├── export-menu.js
│       │   ├── progress-bar.js
│       │   └── notification.js
│       ├── views/
│       │   ├── planning.js
│       │   ├── architecture.js
│       │   ├── tools.js
│       │   ├── testing.js
│       │   └── about.js
│       └── lib/
│           ├── ipv4.js
│           ├── ipv6.js
│           ├── vlsm.js
│           ├── visualizer.js
│           ├── config-gen.js
│           └── exporter.js
└── dist/               ← gitignored
```

---

## Navigation (SPA Hash Router)
| Route | Section | Content |
|-------|---------|---------|
| `#planning` | Planning | Subnet Calculator IPv4/IPv6 + VLSM Planner |
| `#architecture` | Architecture | Network Visualizer (ASCII/SVG tree) |
| `#tools` | Tools | Config Generator + Export |
| `#testing` | Testing | Ping, MTR, Bulk Ping, TCP Ping, HTTP/DNS, IP Lookup, iPerf3 |
| `#about` | About | App info |

---

## Changelog

### v1.3.0 — 2026-04-17
- `feat: IP Geolocation — new IP Lookup tab (country, region, city, ISP, ASN, coordinates, timezone)`
- `feat: MTR — Location column with per-hop geo enrichment via batch lookup after completion`

### v1.2.0 — 2026-04-17
- `feat: MTR replaces Traceroute — per-hop statistics (loss%, sent, recv, last/avg/best/worst ms)`
- `feat: HTTP/DNS auto-prefix https:// when protocol is omitted`
- `fix: About — removed Theme row and CLAUDE.md integration`
- `refactor: UI design refresh — lighter backgrounds, glassmorphism panels, reduced glow intensity`

### v1.1.0 — 2026-03-17
- `feat: subnet calculator — split prefix into smaller masks with copy/export`
- `fix: bulk ping rewritten to use OS ping command (was TCP socket, missed ICMP-only hosts)`
- `fix: iperf "session already active" error — added finished flag + error handler`
- `fix: VLSM planner always returned /30 — loop break condition was inverted`
- `feat: public IP badge in topbar with click-to-copy`
- `fix: CSP connect-src to allow public IP lookup APIs`
- `refactor: UI theme — darker panels, gradient buttons, dot-grid background`
- `remove: Packet Capture tab (WinDump incompatible with Npcap 1.60+)`

### v1.0.0 — 2026-03-16
- `feat: project foundation - electron shell + jarvis theme`
- `feat: core calculation libraries - IPv4, IPv6, VLSM, visualizer`
- `feat: reusable UI components`
- `feat: client-side views - planning, architecture, tools, about`
- `feat: IPC security layer`
- `feat: network testing tools - ping, mtr, fping, tcpping, http, iperf3`
- `feat: packaging, icons, documentation`
