# Solution 3

A generic starter using the shared foundations of RELEX Promise Ledger and Elisa Signal Room, with Signal Room's green/sage palette. This is scaffolding, not a RELEX challenge implementation.

## Run

Node 24.18+ and npm are required.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:34342. Production: `npm run build && npm start`. The fixed port is **34342**. Runtime SQLite data is created lazily in `data/app.sqlite` and ignored by Git. Change `DATA_DIR` to relocate it. The settings name is shared across this single starter instance; there is no authentication or tenant model.

## Included

Svelte 5, SvelteKit 2, TypeScript, Vite, Node adapter, npm lockfile, built-in SQLite, server loads/actions, local DM Sans and Manrope variable fonts, Lucide icons, custom responsive CSS, sidebar/header/footer, cards, badges, search/filter table, native accessible dialog, empty/error states, and a saved settings form with progressive enhancement.

Development tools: svelte-check, tsx + node:test, Playwright/Chromium, axe accessibility checks, Prettier and its Svelte plugin. Only dependencies shared by both reference projects are included; the unused auto adapter, Elisa geography/data pipelines and all domain engines are omitted.

## Verify

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser tests build and launch their own server on 34342, using `test-results/data`. Stop any running app first. After successful checks, start the app and run `npm run screenshots` to capture desktop/mobile images in `docs/screenshots/`.

## Operations

The app runs directly on the host. `deploy/relex-solution-3.service` is an optional systemd user service template, not an installed service. Ensure Node is on the service PATH. To install after building, copy it to `~/.config/systemd/user/`, run `systemctl --user daemon-reload`, then `systemctl --user enable --now relex-solution-3`.

For public hosting, configure Caddy separately, set `ORIGIN` to the exact public HTTPS origin, and set HOST to an interface reachable from the proxy. No public route is configured by this scaffold. Back up the SQLite database with SQLite's backup facilities or stop the service before copying the database and any WAL files.

See [scope and architecture](docs/SOLUTION.md) and [walkthrough](docs/PITCH.md).
