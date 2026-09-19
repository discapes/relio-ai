# Starter scope and architecture

The intended use is a clean base for the next implementation. The demo is limited to browsing neutral UI examples, filtering a table, opening a dialog, and saving the workspace name. There is no corpus ingestion, memory engine, release policy, model connection or geography layer.

SvelteKit owns routing, SSR, server loads and form actions. A root server load reads the shared workspace name. The settings action validates it and writes a parameterized SQLite upsert. The database is opened lazily and schema creation is idempotent. No database is needed during compilation. This is a single-instance settings example, not per-user persistence.

Reusable Card, Badge and Dialog components use typed props and Svelte snippets. The dialog uses native modal behavior, focus trapping and Escape support. The collection demonstrates search, status filtering and an empty state with explicitly fictional sample items. It is not saved. Settings remain usable without JavaScript.

Colors follow Signal Room: forest #1c7258, page #f7f8fa, ink #26342f, muted #303e36, border #e6eae9, sage #f0f4f0, warning #fff5dd. DM Sans is the body face; Manrope is used for headings. Fonts are served locally. Layout shifts to a top navigation on mobile. Body text is 16px, secondary text 14px; controls have 44px minimum targets.

Unit tests verify actual persistence across reopening and invalid-input rejection. Browser tests exercise search, filtering, dialog dismissal/focus restoration, settings with/without JavaScript, axe checks and mobile overflow. The service template runs the Node build on port 34342. It is supplied without installing or publishing it.

## Validation record

2026-09-20: `npm run check` completed with zero errors and warnings; the persistence test passed; both Playwright workflows passed, including desktop/mobile axe scans and settings with JavaScript disabled. Production compilation and Prettier checks passed. Final 1440px desktop and 390px mobile Chromium screenshots were captured and visually reviewed in `docs/screenshots/`.

Dependency audit reported three low-severity entries in one transitive `cookie` advisory chain through SvelteKit and adapter-node. The suggested automatic fix was a major downgrade; it was not applied. No moderate, high or critical entries were reported.
