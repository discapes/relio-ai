# Validation record

Implementation and evaluation are ongoing. This file records observed behavior; outstanding checks remain explicit.

## Deterministic checks

Svelte check and production build pass. The initial integrated suite passed 15 tests covering full parsed import, persistence, project/level source and claim scopes, named/alias/person-role erasure, private preferences, mail idempotency, fresh L1 context, midway email history isolation and in-flight erasure publication. Further regression cases cover owner event replay, per-level preparation, erased-owner preferences and uncited factual drafts.

Four Playwright tests passed on the running application: source navigation and simulator delivery, private preference persistence and persona isolation, foreign-project direct-source denial, and desktop/mobile accessibility with no serious or critical axe findings. This also checks viewport overflow. The tests use controlled data and do not establish live model quality.

## Live inference findings

Two concurrent simple JSON calls completed in approximately 0.32 seconds each. The initial full-corpus UAT answer took 44.65 seconds and preserved pilot/category scope, approval attribution and the missing attachment distinction.

Initial extraction exceeded the output budget. It now uses source partitions with full permitted contextual evidence, compact structured entries and a separate support-verification pass before atomic publication.

Initial answer evaluations exposed malformed quotation spans, incorrect model-generated citation numbers, long source-ID corruption and empty thinking-mode responses. Current code uses short stable prompt handles mapped to original source IDs, source-grouped full text, a claim-level verifier returning paragraphs with source IDs, and server-assigned numeric citations with verbatim source passages. Empty/invalid JSON retries once. Thinking mode is disabled by default following repeatable empty-content failures; diagnostic logs contain finish reasons and token usage only.

Generated factual paragraphs without source support are rejected unless the verifier explicitly marks an evidence gap. Pure personal-memory acknowledgements are produced from actual saved preference state. Source viewers show neighbouring permitted turns because the transcript parser preserves fragmented utterances.

Independent practice reference answers are in `practice_reference.md`. Initial failed runs are preserved separately; `PRACTICE_ANSWERS.md` and `practice_review.md` track the latest actual evaluation. A generated answer is not automatically a passed semantic test.

## Remaining release checks

- Verify both live email scenarios, linked briefing/calendar updates, stakeholder guidance and customer card export.
- Complete all nine practice answers and correct material evidence/attribution failures.
- Verify prepared briefs at each demo access level, public URL, service restart and failure recovery.
- Capture and visually review final desktop/mobile screenshots after functional validation.

## Boundaries

Identity selection, email transport and calendar input are explicit demonstrations. Inference location is Helsinki as supplied by the team. Runtime erasure covers the current application workspace, its source copies and stored derivatives. The organiser's immutable reference corpus, separate workspaces, downloaded files and inference-provider retention are separate boundaries. Indirect identity references are handled conservatively through unique roles, aliases and local continuation passages; arbitrary semantic coreference remains a limitation requiring inspection.
