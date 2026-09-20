# Relio

Active RELEX project implementation. Read ../spec/README.md and the full product conversation before changing behavior. Every delegated agent inherits full conversation history (fork_turns: all).

SvelteKit + TypeScript, SQLite and GLM 5.3 Flash inference on Verda (formerly DataCrunch) in Helsinki. Run Node directly on the host and reuse port 34342. Tests use isolated data; coordinate browser tests with the running service. Follow the parent workspace writing and source-handling instructions.

src/lib/types.ts Shared request, source, claim, artifact and interface contracts.
src/lib/server/memory.ts Parsed corpus import, synchronous scoped read reuse, indexed People discovery, identities and persistent person erasure.
scripts/profile-workspace.mts Temporary-database timing of People discovery and page-load work.
tests/memory-reads.test.ts Original People-output equivalence, scoped read invalidation, access and erasure checks.
docs/PERFORMANCE.md Bottleneck measurements, read-scope lifetime and isolated production validation on port 42937.
src/lib/server/model.ts Bounded Verda inference, provider delta streaming, source handles and exact source binding.
src/lib/server/workflows.ts Personal memory, answers, briefings, verified semantic claims, email delivery, durable work and meeting extraction.
src/lib/server/session.ts Signed isolated workspace cookies, persistent server-only signing key and demo identity/access resolution.
src/lib/server/erasure-context.ts Transcript speaker-exchange and personal-reference dependency removal.
src/lib/server/meeting-selection.ts Latest permitted transcript dates with explicit audience scope.
src/lib/server/transcript-passages.ts Exact-record completion of unfinished adjacent same-speaker transcript fragments.
docs/ADVERSARIAL_REVIEW.md Independent whole-product findings and bounded retests; internal only.
docs/ADVERSARIAL_TRIAGE.md Finding decisions, fixes, regressions and remaining boundaries; internal only.
src/lib/server/reviewer.ts Reviewer-facing design, usage, architecture and scoped practice references.
src/lib/components/GuideArticle.svelte Same-shell prose, responsive evidence tables and source links for reviewer pages.
src/lib/components/ExtendedSlides.svelte Responsive native PDF viewer with Open PDF and Download links at /?view=slides.
static/relio_pitch.pdf User-supplied extended pitch deck, copied verbatim from artifacts/relio_pitch.pdf; orig: relio_pitch.pdf.
docs/DESIGN.md One-page reviewer design covering provenance, stale facts, deletion and inference location.
docs/HOW_TO_USE.md Product walkthrough and how to inspect evidence, scope and erasure.
docs/HOW_IT_WORKS.md Data flow, answer preparation, personal memory, access, updates and operating boundaries.
docs/PRACTICE_GUIDE.md Source-reviewed practice answers displayed only in an unerased Acme L3 view.
src/routes/ Workspace, memory, people, Outlook simulator, sources and scoped search/state endpoints.
src/lib/people.ts Scoped recorded-name matching and email-evidenced organization labels.
src/lib/components/NameText.svelte Escaped name links to selected People profiles across sources, mail, claims and evidence.
src/lib/presentation/citations.ts Inline reference tokens and document/passage grouping with original receipt numbers.
src/lib/components/ Evidence presentation, Figtree PNG/text cards, status badges and source-connected knowledge graph.
src/lib/components/ChatStream.svelte Shared Ask and meeting-preparation progress, streamed drafts and checked final answers.
src/lib/chat-session.svelte.ts Layout-owned browser chat state surviving ordinary navigation with workspace, access and erasure cancellation.
src/lib/server/chat-activity.ts Request-scoped progress and cancellation, with detached background processing.
src/routes/chat/stream/+server.ts Scoped, uncached NDJSON chat stream with session and epoch guards.
docs/STREAMING.md Transport, provisional/final boundary, isolation checks and measured live timing.
docs/live_stream_timing.json Actual server events and draft/final timing from the full UAT query.
src/app.css RELEX semantic palette, stronger secondary text, 15px interface typography and locally bundled Figtree.
src/lib/assets/relex_logo.svg Official RELEX RGB wordmark; orig: relex-primary-logo-RGB-vector.svg.
src/lib/assets/relio_icon.svg Relio R favicon using the existing navy palette.
src/lib/assets/favicon.png Official RELEX symbol displayed left of the Relio sidebar title; orig: cropped-relex-mark-square-192x192.png.
docs/CITATION_UX.md Grouped citation behavior, exact-reference preservation and bounded presentation changes.
docs/JUDGE_UX.md First-use improvements, browser checks and deferred answer-quality issues.
src/lib/presentation/navigation.ts Source-return locations for answers, graph topics, profiles and source lists.
docs/BRANDING.md Color roles, font/logo attribution and isolated review server on port 41851.
docs/screenshots/ Reviewed public RELEX-branded desktop/mobile, graph/focus, claims, source, email, people, erasure and design views.
docs/FIGTREE_LICENSE.txt Figtree OFL-1.1 license; orig: @fontsource-variable/figtree/LICENSE.
tests/ Deterministic persistence, access, erasure, delivery and private-context tests; browser workflows and accessibility.
docs/PREPARED_PEOPLE.md Prepared archive reuse after private chat, inference-free page loads, opt-in daily refresh and resumable generation.
scripts/prepare-people.mts Resumable personalized People guidance preparation with retained results and per-context filters.
scripts/ Baseline preparation, live capability/practice evaluation, atomic deployment, startup and screenshot capture.
scripts/publish-build.mjs npm postbuild hook: copies successful production builds into immutable releases and atomically selects the next service startup release.
.releases/ Git-ignored immutable production builds; current symlink selects the release loaded at service startup.
docs/ Product architecture, demo scenarios, reviewed answers, raw evaluations, model-quality diagnostics, validation and submission documents.
scripts/quality-probe.mts Controlled original-question evaluations with preserved outputs.
scripts/reverify-extraction.mts Document-balanced revalidation of captured model candidates.
deploy/ Node systemd user service configuration.

src/lib/server/answer-retention.ts Retains generated passages with surviving exact evidence and renumbers citations after erasure.
src/lib/server/practice-guide.ts Filters reviewed Practice answer passages by current access and surviving evidence.
docs/PRACTICE_EVIDENCE.json Reviewed Practice paragraph dependencies and source text hashes.
docs/PROVENANCE_UX.md Snapshot freshness, selective erasure retention, reviewer sections and persistent Ask behavior with limitations.
tests/provenance-retention.test.ts Independent statement retention, baseline reuse after erasure and sanitized deletion follow-ups.

Run npm run check, npm test, npm run build and npm run test:e2e. Perform final desktop/mobile Chromium visual review after functional checks. Record actual live-model evidence and remaining limitations in docs/VALIDATION.md. Commit coherent phases and keep this file current.

src/hooks.server.ts Fail-open request observation for user page entries and actions; excludes polling, data loads and static assets.
src/lib/server/usage.ts Bounded asynchronous local usage logs, request context and explicit input/event fields.
src/lib/usage-browser.ts Passive browser observation of navigation and controls, delivered in small batches.
src/routes/usage/+server.ts Bounded event collection endpoint; stored logs have no public read route.
scripts/usage-report.mjs Local usage summaries and browser/workspace timelines from rotated NDJSON logs.
docs/USAGE_LOGGING.md Internal analytics events, limits, commands and isolated validation on port 43729.
docs/VISITOR_OUTCOME_AUDIT.md Read-only review of two observed visitor sessions, checking actual saved answers, erasure, email, calendar provenance and brief attribution against sources.
tests/usage.test.ts Logger failure containment, rotation, input bounds and automatic-request exclusion.
tests/browser/usage.spec.ts Browser navigation/control collection and failed-delivery behavior.
