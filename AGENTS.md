# Solution 3 starter

Blank SvelteKit + TypeScript foundation. Keep routes empty until a product workflow is requested. Retained components and CSS are available but unused.
Use port 34342 consistently; run Node on the host. Browser tests own that port, so stop the app first.
Signal Room colors live in src/app.css; DM Sans body text, Manrope headings, Lucide icons.
Use server loads and form actions when implementing future workflows. SQLite is built into Node; no ORM.
Run npm run check, npm test and npm run test:e2e before final screenshots. Update docs and commit at major phases.

src/lib/components/ Unused Card, Badge and native dialog primitives.
src/lib/server/database.ts Inactive SQLite/settings helper retained for future use.
src/routes/ Bare layout and blank home page.
scripts/ Production startup and Chromium screenshot capture.
tests/ Database helper test and blank-page browser smoke test.
deploy/ Optional systemd user service template; not installed automatically.
docs/ Scope, future pitch placeholder and blank-page screenshots.
