# Streaming project answers

“Ask your project” starts an animated progress panel immediately. The server then reports the work it performs: interpreting the request, counting permitted records and documents, reviewing research partitions when needed, composing a draft, checking its factual support and binding the final source excerpts. The panel also reports a wait for an inference slot and a structured-output retry when those occur. These messages describe application operations; model reasoning is never displayed.

GLM-5.3-Flash sends actual content deltas through its OpenAI-compatible SSE interface. The application decodes the growing top-level JSON `text` field and forwards it over a POST NDJSON response. Escapes, split Unicode characters and chunk boundaries are handled before text is shown. This is live model output, with no typewriter replay of a completed answer.

The draft is labelled **Draft · source checks pending**. It can change during verification and has no clickable citation claims. After the verification pipeline checks the original passages and binds source records, the final answer replaces the draft and uses the shared clickable evidence component. Only the checked final answer enters conversation history. A remembered-preference confirmation can complete directly without a factual draft.

Stop cancels the current request and clears the draft. Failures and interrupted connections clear provisional text and restore the question controls, with a retry button. Ordinary navigation through People, project memory, reviewer pages and individual sources keeps the request running. A compact link returns to the pending question or completed answer. The root layout owns the browser request state through Svelte context; no mutable chat state is shared between server renders. Persona/access changes, workspace reset and erasure cancel outstanding work and clear private input, drafts and the retained result. Closing or reloading the browser document still disconnects an unfinished request.

“Prepare for this meeting” uses the same stream and progress panel. It sends the selected meeting ID; the server resolves the permitted meeting and uses the existing meeting-preparation task with its attendees, purpose and personal context. Its checked result appears in Ask and is retained in conversation history. The meeting shortcut starts one request; Stop and retry use the same controls as an ordinary question. Morning-brief refresh remains a background job, and an empty briefing displays preparation progress only when a corresponding job is queued or running.

## Boundaries

The server resolves the selected workspace and access from session cookies, checks the submitted context, validates the request origin and checks the erasure epoch before every emitted event and final persistence. Session revisions close the race between reading a request body and registering its stream. Session changes, reset and erasure synchronously cancel registered streams. A disconnected client aborts its nested model calls and queued inference. The client checks current context while waiting and again before accepting the final response.

Request-scoped activity and cancellation use Node async context. Detached background jobs and scheduling timers explicitly exit that context. A briefing for another employee cannot publish its private draft into the active chat or inherit that chat's cancellation.

All model inference uses the existing local forwarding endpoint for GLM-5.3-Flash, hosted in Helsinki on Verda (formerly DataCrunch), as confirmed by the team. No new model service or external transport was added.

## Measured response

A real query, “What was the scope of the UAT sign-off?”, ran through the complete L3 pipeline against the 2,974 permitted Acme records in 45 documents on the isolated review server, 20 September 2026:

| Event | Time after request |
| --- | ---: |
| First server progress event | 0.092 seconds |
| Permitted-record and document counts | 0.502 seconds |
| First model-written draft text | 15.988 seconds |
| Source verification began | 18.841 seconds |
| Final checked answer with seven excerpts | 21.750 seconds |

These timings describe one measured request. Question complexity, inference load and structured-output retries affect other requests. The preserved event log is [live_stream_timing.json](live_stream_timing.json).

## Validation

`tests/chat-stream.test.ts` checks incremental JSON/UTF-8 decoding, actual model-delta delivery, cancellation and session revisions. `tests/chat-response.test.ts` checks provisional text before final verification, final-only persistence, reset cancellation when the abandoned workspace retains its epoch, and isolation of a real queued other-owner briefing containing a private canary. Browser tests cover immediate progress, provisional-to-final replacement, clickable final receipts, stop/retry/error handling, source navigation and return, completion while away, access changes while away, the meeting-preparation shortcut and mobile accessibility. The inference capability probe and full UAT query used the actual Helsinki endpoint; browser fixtures perform no model calls.

The isolated streaming review server uses port 43691, `DATA_DIR=/tmp/receipt-stream-validation` and `DISABLE_BACKGROUND=1`.


After person erasure, provisional drafts pass the existing suppression-token check before publication. The client receives text with the trailing five words held back until subsequent text makes them safe to check; the final checked answer supplies the complete result. This prevents a stored erased identity from appearing in an incomplete streamed name before the final persistence guard. A rejected draft returns a neutral error and creates no answer artifact. The whole-product review and triage are internal records in `ADVERSARIAL_REVIEW.md` and `ADVERSARIAL_TRIAGE.md`.

The navigation and meeting-shortcut regression checks use the isolated development server on port 45937, `DATA_DIR=/tmp/relio-navigation-ux`, `DISABLE_BACKGROUND=1` and an unreachable inference URL. Browser stream fixtures run without model requests.
