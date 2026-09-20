# Receipt

Active RELEX project implementation. Read ../spec/README.md and the full product conversation before changing behavior. Every delegated agent inherits full conversation history (fork_turns: all).

SvelteKit + TypeScript, SQLite and local GLM 5.3 Flash inference. Run Node directly on the host and reuse port 34342. Tests use isolated data; coordinate browser tests with the running service. Follow the parent workspace writing and source-handling instructions.

src/lib/types.ts Shared request, source, claim, artifact and interface contracts.
src/lib/server/memory.ts Parsed corpus import, scoped reads, identities and persistent person erasure.
src/lib/server/model.ts Bounded inference, source handles and exact source binding.
src/lib/server/workflows.ts Personal memory, answers, briefings, verified semantic claims, email delivery, durable work and meeting extraction.
src/lib/server/session.ts Isolated workspace cookies and demo identity/access resolution.
src/lib/server/submission.ts Allowlisted submission documents, restricted by level and erasure epoch.
src/routes/ Workspace, memory, people, Outlook simulator, sources and scoped search/state endpoints.
src/lib/components/ Evidence presentation, Figtree PNG/text cards, status badges and source-connected knowledge graph.
src/app.css RELEX semantic palette, shared controls, responsive layout and locally bundled Figtree typography.
src/lib/assets/relex_logo.svg Official RELEX RGB wordmark; orig: relex-primary-logo-RGB-vector.svg.
src/lib/assets/favicon.png Official RELEX symbol; orig: cropped-relex-mark-square-192x192.png.
docs/BRANDING.md Color roles, font attribution and isolated review server on port 41851.
docs/FIGTREE_LICENSE.txt Figtree OFL-1.1 license; orig: @fontsource-variable/figtree/LICENSE.
tests/ Deterministic persistence, access, erasure, delivery and private-context tests; browser workflows and accessibility.
scripts/ Baseline preparation, live capability/practice evaluation, atomic deployment, startup and screenshot capture.
.releases/ Git-ignored immutable production builds; current symlink selects the deployed release.
docs/ Product architecture, demo scenarios, reviewed answers, raw evaluations, model-quality diagnostics, validation and submission documents.
scripts/quality-probe.mts Controlled original-question evaluations with preserved outputs.
scripts/reverify-extraction.mts Document-balanced revalidation of captured model candidates.
deploy/ Node systemd user service configuration.

Run npm run check, npm test, npm run build and npm run test:e2e. Perform final desktop/mobile Chromium visual review after functional checks. Record actual live-model evidence and remaining limitations in docs/VALIDATION.md. Commit coherent phases and keep this file current.
