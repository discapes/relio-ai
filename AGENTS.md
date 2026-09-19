# Solution 3 starter

Generic SvelteKit + TypeScript foundation; keep product-specific implementation out until requested.
Use port 34342 consistently; run Node on the host. Stop the app before browser tests, which own the same port and use isolated test data.
Signal Room colors live in src/app.css; DM Sans body text, Manrope headings, Lucide icons.
Use server load functions and form actions. SQLite is built into Node; no ORM.
Run npm run check, npm test, npm run test:e2e before final screenshots. Update docs and commit at major phases.

src/lib/components/ Card, Badge and native dialog primitives.
src/lib/server/database.ts Lazy SQLite connection and validated workspace settings.
src/routes/ Shared app shell, example collection and settings form.
scripts/ Production startup and Chromium screenshot capture.
tests/ Persistence and browser/accessibility checks.
deploy/ Optional user systemd service template; not installed automatically.
docs/ Scope, usage and screenshots.
