# Independent adversarial review

Reviewed on 20 September 2026 against application commit `0b70dee`, reviewer-document commit `3fdf71e`, and immutable release `2026-09-20T01-47-44-719Z`. The reviewer made no application fixes. Subsequent changes belong to the separate fix lead; their disposition and verification are tracked in `ADVERSARIAL_TRIAGE.md`.

The review found five high-priority defects and four confirmed medium-priority defects. One further medium-priority navigation finding is reproducible in the browser test, with its cause unresolved. The strongest failures concern person erasure, workspace identity, late browser responses and writes across trust boundaries. Two actual model calls also reproduced incorrect latest-meeting scope and incomplete ROI follow-up.

## Method and boundaries

An isolated instance of the immutable release ran on `127.0.0.1:45829` with `DATA_DIR=/tmp/relex-adversarial/browser-db` and background inference disabled. Module probes used separate temporary SQLite directories. No production data, infrastructure or external mail was modified. Live semantic checks used the configured GLM endpoint in Helsinki. Controlled provider outputs tested deterministic enforcement boundaries; these are explicitly distinguished from live model behavior below.

Probe scripts and raw output are retained under `/tmp/relex-adversarial/`. This report contains the repro steps and observations needed to interpret those artifacts. Temporary files are investigation evidence, not a permanent deployment dependency.

## Findings

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| AR-01 | High | Person erasure leaves identifiable personal context in surviving source passages | Actual isolated erasure and source enumeration |
| AR-02 | High | Identical mail event IDs overwrite another workspace's calendar item | Two-workspace deterministic workflow probe |
| AR-03 | High | A source-processing model response can write personal memory despite a read-only request | Controlled provider response through actual workflow |
| AR-04 | High | An arbitrary workspace cookie can select and mutate the reserved prepared baseline | Actual isolated HTTP requests |
| AR-05 | Medium | Latest project meeting is silently narrowed to customer-attended meetings | Actual GLM answer, 103.1 seconds |
| AR-06 | High | A delayed source-search response restores restricted snippets after access downgrade | Actual browser response interception |
| AR-07 | Medium | Streaming publishes an erased identity before the final suppression check | Controlled SSE through actual stream handler |
| AR-08 | Medium, cause unresolved | Reviewer navigation intermittently loses an intended transition | Two browser-test failures; separately awaited run passes |
| AR-09 | Medium | New mail refreshes only maximum-clearance briefs, leaving prepared lower modes stale | Actual job scheduling with controlled brief generation |
| AR-10 | Medium | ROI outcome answer omits decisive later evidence and mixes certainty with an old checkpoint | Actual GLM answer, 42.8 seconds |

### AR-01: Person erasure leaves personal context in available records

Affected code: `src/lib/server/memory.ts`, `erasePerson`, and all consumers of surviving sources.

Repro: create a fresh L3 workspace; erase `sofia-almeida` through the workflow; refresh the access context and enumerate `memory.sources(ctx)`. The operation reports 336 source records removed. Nonetheless, the following records remain available:

- `transcripts/04_2024-07-09_INTERNAL-handover-presales-to-delivery#utterance-0059`
- `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0066`

These contain distinctive role context and personal health information tied to the erased person by the surrounding original conversation. Removing explicit names and short neighboring windows does not remove these distant or fragmented references. The surviving records can still enter retrieval and source views. This is narrower than a claim that every health-related word must be deleted: the cited records concern the erased person, whereas several other lexical matches in the raw probe are ordinary project scheduling and are not findings.

Evidence: `probe.mts`, `deterministic-probes.json`. Acceptance for a fix: both identified contextual references disappear from accessible sources and derived outputs; unrelated project facts remain usable. The review does not establish that a finite alias/window rule can guarantee complete semantic erasure for arbitrary future documents.

### AR-02: Mail event identity is not namespaced for calendar storage

Affected code: `src/lib/server/workflows.ts`, meeting schema and `processMail`.

Repro: create two unrelated workspaces A and B. In each, submit an agent-addressed message with the same client-provided event ID, `same-event`. Let meeting extraction produce a valid meeting. A first receives `meeting-same-event`; after B processes its own message, A's meeting disappears and B has the item.

The mail table uses workspace plus event ID, but `wf_meetings` has a globally unique `id`; `INSERT OR REPLACE` with `meeting-${mail.id}` replaces the row owned by A. This is a cross-workspace integrity issue even though normal browser-generated UUIDs rarely collide. A client controls the event ID and the intended isolation must not depend on collision avoidance.

Evidence: `probe.mts`, `deterministic-probes.json`. Acceptance: identical event IDs in separate workspaces preserve both meetings; retries in one workspace remain idempotent.

### AR-03: Evidence processing has unintended authority to save a preference

Affected code: `src/lib/server/workflows.ts`, `answerQuestion`.

Repro: ask a factual question, “What did the project meeting decide?” Have the first, request-only classifier return `action: question`, `needsEvidence: true`. Have the subsequent source-processing response include a `remember` field. The workflow saves that value as a private preference and responds with a memory confirmation after two model calls. It does this despite the explicit read-only classification and without the normal evidence verification.

A second post-verification branch also honors a generated `remember` field. Source documents are untrusted inputs to this stage, so this creates a path from evidence processing to persistent personal-memory mutation. The probe demonstrates the missing authority boundary with a controlled provider response. It does not claim that a real adversarial email successfully induced that response from GLM during this review.

Evidence: `probe.mts`, `deterministic-probes.json`. Acceptance: only intent derived from the current employee request can authorize memory writes; later answer or verifier output cannot introduce that authority.

### AR-04: Unsigned workspace cookies can select shared internal state

Affected code: `src/lib/server/session.ts`, session resolution and prepared-workspace seeding.

Repro on the isolated HTTP server: send `relex_workspace=prepared-baseline; relex_persona=p1; relex_level=3`. `/state` resolves the reserved baseline with L3 access. Posting an ordinary preference action with the same cookie succeeds and writes into that workspace. The parser accepts arbitrary alphanumeric workspace IDs rather than proving the identifier was issued by this server.

The baseline is shared state used to seed newly created demo workspaces. It is therefore materially different from the deliberately simulated persona selector. An attacker who knows its predictable identifier can mutate or erase shared prepared state. Guessable or disclosed identifiers of other workspaces have the same missing integrity protection.

Acceptance: tampered, unsigned, unissued and reserved identifiers receive fresh isolated workspaces; valid server-issued sessions survive a process restart with a persisted signing key. Existing database rows should remain intact during the cookie upgrade. A copied valid signed cookie remains a bearer credential; preventing deliberate token sharing is outside this finding.

### AR-05: “Most recent project meeting” becomes “most recent customer meeting”

Affected code: `src/lib/server/workflows.ts`, question interpretation, source selection and verification.

Actual question: “When was the most recent meeting recorded in the Acme project archive, and what was discussed?” The fresh L3 response took 103,065 ms and attached 39 receipts. It selected the 16 June 2026 QBR. It acknowledged the 2 July internal RELEX discussion but excluded it as an internal conversation rather than a project meeting with Acme.

The user did not restrict attendance. The 2 July record is explicitly a `meeting_transcript`, titled “Acme renewal and resourcing”, and is permitted at L3. The answer therefore changed the requested scope and summarized the wrong meeting. This is not a missing-corpus or access-denied case.

Evidence: `latest.mts`, `latest-meeting.json`; latest available document `transcripts/23_2026-07-02_INTERNAL-renewal-resourcing`. Acceptance: archive-wide latest meeting selects the maximum permitted meeting date; explicit customer-only/internal-only requests respect their stated scope, and the selected document supplies the summary.

### AR-06: A late search response crosses the displayed access boundary

Affected code: `src/routes/+page.svelte`, source-search state and `loadMoreSources`.

Browser repro:

1. Open project memory as Ana at L3 and request “Browse all source passages”.
2. Intercept the `/search` response after the server has produced it, but hold its delivery.
3. In the same browser context, change the session to p3/L1 and allow the normal state poll to update the page. Only L1 cards are visible.
4. Release the old response. L2 source cards reappear while `/state` still reports p3/L1.

The output contains actual internal email snippets. The initial server search was correctly authorized at the time it ran. The failure is client-side publication of an outdated result after an access-context change. Clearing current arrays alone does not invalidate pending promises.

Evidence: `search-race.mjs`, `search-race.json`. Acceptance: search responses are tied to the initiating context/generation and discarded after persona, level, workspace or erasure changes; equivalent late-response handling should cover other asynchronous source-bearing views.

### AR-07: Provisional streaming bypasses the existing erased-identity guard

Affected code: `src/lib/server/chat-response.ts`, model draft emission and final artifact suppression.

Repro: erase Kwame, refresh context, and ask a neutral pilot question. Supply a controlled model SSE containing the erased full name and a surviving source ID. The stream emits a `draft` event containing that name. Final persistence then rejects the response with “Generated content refers to erased personal information”; no answer artifact is saved.

The final guard works, but it runs after the browser has received the sensitive draft. Epoch checks cover an erasure occurring during a request; they do not prevent a model from reintroducing already-erased identity information. Calling a draft provisional does not provide a privacy boundary.

Evidence: `stream-erasure.mts`, `stream-erasure.json`. Acceptance: the same suppression boundary applies before publication of streamed content, including names fragmented across incoming chunks. This controlled response proves the publication path; it is not a measured frequency of spontaneous live-model reintroduction.

### AR-08: Reviewer navigation fails under the existing browser scenario

Affected area: `src/routes/+page.svelte`, reviewer navigation, polling and invalidation; exact cause remains unconfirmed.

Running all ten browser workflows against the isolated immutable release produced nine passes and one failure. Running `tests/browser/workspace.spec.ts` filtered to `reviewer pages` repeated the failure: after Design and How to use, selecting How it works left the URL at `?view=how-to-use` beyond the five-second assertion timeout.

A separate diagnostic with explicit `waitForURL` calls completed all four reviewer pages successfully. Its network log recorded an old-page data invalidation while the next navigation was underway, followed by an aborted/retried request. The test database had pending background jobs because inference was deliberately disabled; the page polls and invalidates while jobs are pending. This supports investigating a navigation/invalidation race, but does not prove that mechanism caused the two failures. No console exception or broken route was established. A bounded overlap probe then held the old How-to-use invalidation response, clicked How it works, and observed the URL remain on the old page until the held response was released; navigation then completed. This demonstrates a navigation delay behind an in-flight invalidation, but did not reproduce a permanently lost transition.

Evidence: `navigation.mjs`, `navigation.json`, `navigation-race.mjs`, `navigation-race.json` and the Playwright failure output. Repro command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:45829 npx playwright test tests/browser/workspace.spec.ts -g 'reviewer pages'`. Acceptance: repeated intended transitions complete with pending jobs, including when a poll overlaps navigation. If the result is adjudicated as a test synchronization issue, preserve that distinction in triage.

### AR-09: Prepared lower-clearance briefs do not receive automatic updates

Affected code: `src/lib/server/workflows.ts`, mail-triggered refresh, `prepareWorkspace` and scheduled refresh.

Repro: prepare briefs for p1 at L1/L2/L3, p2 at L1/L2, and p3 at L1. Process a new L1 agent-addressed email. Queued brief jobs cover p1/L3, p2/L2 and p3/L1 only. Previously prepared p1/L1, p1/L2 and p2/L1 briefs retain their old content. Visiting those modes sees an existing brief and does not queue a replacement. Scheduled refresh similarly resolves each persona to its maximum level.

This is visible when a user switches into a customer-safe mode after a new shared update: the brief can remain stale while another mode has refreshed. It does not leak higher-level content.

Evidence: `brief-refresh.mts`, `brief-refresh.json`. Acceptance: affected prepared modes are invalidated or regenerated at their own access level, without substituting a higher-level answer or including private context in a shared export.

### AR-10: ROI follow-up stops before the decisive later outcome

Affected code: `src/lib/server/workflows.ts`, research classification, commitment selection and completeness verification.

Actual question: “What was agreed about the ROI timeline at the start of Acme, and does the later record show it was achieved? Give the original commitment and the subsequent outcome with sources.” The response took 42,767 ms and supplied 16 exact receipts. It correctly reconstructed the June 2024 phase-two/twelve-month exchange, then followed it only through June 2025. The trace reports one selected evidence observation across four partitions.

The answer opens “The later record shows the commitment was not met”, but ends by limiting its conclusion to the June 2025 checkpoint and declaring subsequent coverage unverified. At that checkpoint its cited material establishes an outstanding action, rather than the later measured outcome requested. Available June 2026 QBR turns explicitly state the signature date, actual fresh go-live date, missed twelve-month outcome and a proposed alternative clock which the speaker declines to argue for:

- `transcripts/22_2026-06-16_q2-business-review#utterance-0041` through `#utterance-0045`
- `transcripts/22_2026-06-16_q2-business-review#utterance-0048`, `#utterance-0049`, `#utterance-0051`, `#utterance-0053`, `#utterance-0055`

These are not inaccessible records: the separate latest-meeting answer used this same later ROI discussion. A broad outcome question can be narrowed into a selected outstanding-commitment trail, losing later completion/outcome evidence. Exact quotation binding alone cannot establish completeness.

Evidence: `roi.mts`, `roi-trail.json`. Acceptance: outcome questions retain original agreement and later outcome/contradictory evidence, rather than terminating at an earlier chase. Any unresolved coverage qualification must be consistent with the certainty of every preceding conclusion.

## Coverage and remaining limits

Reviewed server boundaries included session parsing, source/search routes, source-bearing reviewer pages, chat streaming, request cancellation, session revisions, background jobs, mail processing, personal preferences, brief modes, calendar storage, prepared-baseline seeding, claim extraction, evidence verification, aliases and erasure. Frontend review covered source loading, context polling, chat cancellation, evidence grouping, source/name links, export construction, reviewer navigation and email simulation.

The nine passing original-build browser workflows covered live-progress/final rendering with controlled streams, cancellation and navigation, context clearing, grouped 41-citation interaction, people/source links, email forms, private preference workflows, foreign-project denial, mobile layout/accessibility and view switching. These results are useful behavior checks, not proof that every possible race is prevented.

Access-scoped source routes and the source-bearing Practice answers page enforce project/level checks; practice answers are withdrawn after workspace erasure. Customer-share generation uses fresh L1 context and excludes private preferences. No additional export or reviewer-page data leak was established. Previously downloaded files remain outside server-side revocation, as documented. Simulated SSO, email delivery, calendar data and the fixed demo clock are authorized product choices, not findings.

Only two new live semantic calls were made. Both ran without competing evaluation jobs. The prior measured P1/P3 coverage omissions and P8 follow-up limitations remain relevant known limitations in `model_quality_review.md`; this review did not rerun all nine practice questions or treat curated reference prose as generated output. General prompt-injection robustness, arbitrary-language coreference erasure, sustained provider outages, load/denial-of-service behavior and exhaustive assistive-technology compatibility were not proven. No destructive or load probes were performed.

The exploratory review is complete. Fix disposition and independent retest results should be recorded separately, retaining these original observations even where later code resolves them.

## Independent retests after fixes

These results apply to the fix lead's subsequent working tree, after their coherent-code handoff on 20 September. They do not change the original-release observations above. Module probes used fresh temporary databases. HTTP/browser probes used the separately built instance on `127.0.0.1:41851`, with fresh browser workspaces. Final integrated commit and release identity belong in the triage/release record.

| Finding | Independently observed result |
| --- | --- |
| AR-01 | Both identified residual personal-context passages are absent after erasure. 813 of 2,974 records are removed; 2,161 remain. Concrete unrelated renewal, commercial and separate-subject passages remain accessible. |
| AR-02 | The original same-event probe leaves `meeting-same-event` present in both workspaces after processing B. |
| AR-03 | The original source-stage `remember` injection leaves personal preferences empty. Its deliberately incomplete verifier mock is rejected, instead of producing the old memory-write shortcut. |
| AR-04 | Reserved baseline, unsigned UUID, invalid signature and tampered tokens receive fresh workspaces. Valid signed tokens survive a separate Node process using the persisted 32-byte key, with file mode `600`. HTTP checks independently confirm the baseline/unsigned/invalid cases on the built server. |
| AR-05 | The exact original live question selects and summarizes the 2 July internal meeting in 12,196 ms with 23 receipts. Speaker attribution remains explicitly unresolved. |
| AR-06 | Releasing the original held L3 search response after downgrade leaves only L1 cards. No restricted snippet reappears. |
| AR-07 | The original erased-name SSE probe emits no sensitive draft and saves no answer. It terminates with a suppression error before the offending content is published. |
| AR-08 | The original reviewer-page browser test passes on the fix build (13.8 seconds), including navigation, source links, mobile width and access-scoped practice content. The original failure remains classified as navigation latency/synchronization rather than a proven broken route. |
| AR-09 | Processing the same new L1 message now queues all six previously prepared persona/level brief modes. |
| AR-10 | The exact original ROI question now covers the original expectation, SOW wording, June 2026 admission of the miss and the conflicting July internal recap. The response takes 92,844 ms, with 136 inventory observations and 37 receipts. The selected-old-checkpoint failure is resolved in this run; the evidence-rendering qualifications below still apply. |

Erasure preservation was checked against July transcript turns 1, 3, 6, 20, 29 and 35. All survive. Forty of that document's 49 records remain; the removed set includes target mentions and dependent context. The total deletion count reflects the more conservative speaker-turn dependency handling. This is a bounded regression check, not proof of perfect coreference resolution or minimum possible deletion across arbitrary documents.

Retest artifacts: `session-retest.mts` / `session-retest.json`, `session-http-retest.json`, `probe-retest.mts` / `deterministic-retest.json`, `stream-erasure-retest.mts` / `stream-erasure-retest.json`, `brief-refresh-retest.mts` / `brief-refresh-retest.json`, `search-race-retest.mjs` / `search-race-retest.json`, `latest-retest.mts` / `latest-meeting-retest.json`, and `roi-retest.mts` / `roi-trail-retest.json`, all under `/tmp/relex-adversarial/`.

### Remaining details in the measured ROI answer

The measured answer still contains literal `[-]` markers in several paragraphs. Its optional QBR waste figure, 3.2%, is correct in the corpus, but its receipts cite Ana's utterance 6, ending “three,”, and omit the same-speaker utterance 7, “point two.” The verifier trace nevertheless says that figure was verified. This is a concrete example of incomplete receipt coverage for fragmented transcript numbers. Exact quotation checks establish that each attached quote exists; they do not by themselves establish that every asserted number has all necessary supporting fragments attached.

These two observations were returned to the fix lead for focused rendering and complete-speaker-turn receipt repair. Any resulting deterministic regression checks should be recorded separately; the live answer above must remain intact as the measured result. No broader claim that semantic completeness is solved follows from the successful latest-meeting and ROI selection retests.

### Follow-on receipt repair verification

After the fix lead added `transcript-passages.ts` and marker cleanup, the reviewer replayed the captured ROI answer and its verified paragraphs through the actual `answerQuestion` rendering path with a controlled provider. The captured live artifact was preserved. No further inference request was made.

The replay attached the missing QBR utterance 7, removed every `[-]` marker, and produced 44 exact-source receipts instead of the captured answer's 37. Every resulting quote matched an available runtime record. Independent helper checks confirmed that expansion stopped at the next speaker and did not bridge a missing utterance ordinal. The code restricts expansion to adjacent records in the same document with the same recorded speaker when the earlier text is syntactically unfinished. It does not resolve a semantic dependency across intervening speakers, infer a missing sentence, or guarantee that every asserted fact is supported.

Evidence: `/tmp/relex-adversarial/roi-replay.mts` and `roi-replay.json`. The three controlled provider responses exercise classification, answer generation and verification output handling; they measure application enforcement, not a third live semantic run.

All independent review and retest work is complete. The confirmed original defects have bounded passing retests, and the navigation finding has a passing original browser scenario after polling changes. Remaining limitations concern general model completeness, cross-speaker attribution, semantic erasure coverage and behavior outside the tested cases. The fix lead owns final integrated checks, release and disposition tracking.
