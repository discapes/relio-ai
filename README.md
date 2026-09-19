# Solution 3

A blank SvelteKit + TypeScript starter with the shared RELEX/Elisa tooling and Signal Room color palette. The home page renders no visible content. Components and styles remain available but are not mounted. There are no demo or settings routes, and loading the page does not open SQLite.

## Run

Requires Node 24.18+ and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:34342. Production: `npm run build && npm start`. Fixed port: **34342**.

## Available foundations

Svelte 5, SvelteKit 2, TypeScript, Vite, Node adapter, SQLite helper, local DM Sans and Manrope fonts, Lucide icons, Signal Room CSS, and unused Card, Badge and Dialog components. The SQLite helper and its validation/persistence test are retained for future use; no route calls it.

## Verify

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Browser tests build and start their own server on 34342; stop any running app first. The browser smoke test checks the blank page. Playwright and axe remain installed for future workflows. Start the app and run `npm run screenshots` for desktop/mobile captures.

## Operations

The app runs directly on the host. `deploy/relex-solution-3.service` is an optional systemd user service template, not installed automatically. Ensure Node is on its PATH. For public hosting, configure Caddy separately and set `ORIGIN` to the public HTTPS origin and `HOST` to an interface reachable by the proxy. No public route is configured.

The retained database helper uses `DATA_DIR` (default `data/`) if called. Runtime data is ignored by Git.
