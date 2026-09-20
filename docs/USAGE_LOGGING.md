# Internal demo usage logging

Relio records visitor actions in local NDJSON files for the team. There is no external analytics service or reviewer-facing analytics page. Only calls inside an HTTP request scope are collected; standalone workflow invocations and unit-test model completions produce no usage records. Logging is an observer: it does not start inference, create workspaces, alter application actions, or read response streams.

## Events and interpretation

The request hook records an HTML page entry, a submitted action or session switch, and an accepted question request. Automatic state polling, Svelte data loads, search requests, static assets, and analytics delivery requests are excluded. Client navigation is recorded only after Svelte finishes navigating; initial entry is counted by the server. Each record has a timestamp and request ID. Request scope adds the verified workspace, persona and access level when the existing application code resolves them.

Submitted questions, meeting IDs, email fields, preferences, promoted notes and selected record IDs are recorded from the application's already-parsed input. Text is limited to 8,000 characters per long field and 500 per other field. The observer accepts an explicit field list. Cookies, authentication headers, signing keys, model credentials, file uploads, complete source documents and generated answer bodies are excluded. A question completion records elapsed time and citation count; cancellation or failure has a separate event. The HTTP acceptance event alone does not mean the model answered successfully.

The browser records completed navigation, links and buttons, user-operated disclosure sections, select and checkbox changes, search/filter values on change, form submission intent, visibility changes and browser error messages. It does not record typing, mouse movement, scrolling, DOM snapshots or replay video. Browser events contain a persistent random browser ID, a tab ID, a unique page-load/event ID and the displayed workspace context. Storage refusal is tolerated. Only user-operated disclosure toggles are logged; initial rendering of open sections is excluded.

A button click, form submission and server action can describe different stages of one interaction. The report lists them separately. Page counts combine `page.open` with `browser.navigation`; automatic invalidation is excluded. Source links, People selections and graph selection are recognizable from the path, target, label and selected value. Browser payloads are grouped under `browser` and describe client observations; they are not authoritative identities or proof of successful actions.

Request metadata includes user agent, sanitized referrer, socket peer IP and the `X-Forwarded-For` value supplied by Caddy. The application listens on localhost. Caddy's default forwarding behavior replaces untrusted inbound forwarded headers. Rootless container networking may replace the visitor address before it reaches Caddy, so forwarded IP is recorded as an observation and is not guaranteed to identify a public visitor. Live verification found `forwardedIp=172.18.0.1` and `peerIp=127.0.0.1`: the current proxy network hides the public visitor address. A supplied spoofed forwarding header was replaced. Requests made directly to the local port can supply their own forwarding header.

Cookie-derived IDs are explicitly named `cookieWorkspaceId`, `cookiePersonaId` and `cookieLevel`; these are unverified log hints until the normal route resolves its context. The analytics endpoint never resolves a workspace. Workspace IDs and random browser IDs represent sessions/browser storage, rather than verified people. The report excludes user agents matching common automation markers by default; this cannot distinguish every automated visit or identify the team reliably.

## Read the logs

From the solution directory:

```sh
node scripts/usage-report.mjs
node scripts/usage-report.mjs --since 2026-09-20T10:00:00Z
node scripts/usage-report.mjs --workspace WORKSPACE_ID --timeline
node scripts/usage-report.mjs --browser BROWSER_ID --timeline
node scripts/usage-report.mjs --include-automation
tail -f data/usage/events.ndjson
```

`--timeline` emits complete matching records, including submitted input when present. `--browser` filters browser events; use its workspace IDs to inspect associated server requests with `--workspace`. `--dir` selects another log directory. These commands read files and do not contact the application or inference service.

## Storage and failure behavior

Logs default to `DATA_DIR/usage`, or `data/usage`. Set `USAGE_LOG_DIR` to choose a separate location. The application database and its schema are unchanged. Directories are created with mode 0700 and files with mode 0600. No HTTP endpoint serves these files. `POST /usage` only receives events; other methods cannot retrieve logs.

The writer buffers up to 200 records, with a 32 KiB maximum record size. It flushes asynchronously once a second, rotates at 10 MiB and retains the current file plus six rotations. Old rotations are deleted. Files therefore use approximately 70 MiB at most with the default settings. Browser batches contain at most ten events; the endpoint accepts up to twenty and rejects payloads exceeding 32 KiB. Events are dropped when the buffer is full. A later flush can include an `analytics.dropped` count.

Set `USAGE_LOGGING=0` and restart the service to stop server collection and file writes. The client observer may still issue small delivery requests, which return 204 without reading their body. No new runtime dependency or external account is required.

Collection is best effort. A full disk, malformed payload, blocked beacon, browser closure or service restart can lose events. Errors in the logging writer are contained and requests continue. Responses and inference streams are neither cloned nor buffered by the logger. Browser listeners are passive observers and never prevent the application's default events. A failure to initialize the browser observer leaves the workspace usable.

## Validation

The implementation is checked with isolated unit tests for disabled logging, a failing disk writer, bounded fields, excluded automatic requests, malformed events and file rotation. Browser tests cover navigation/control logging and the same controls when analytics delivery fails. Existing streaming tests continue to use a mock model response, so validation performs no inference. The browser test server uses port 43729 and a temporary database containing copied prepared baseline data. The live application database is never modified by these tests.

Validation on 20 September 2026: `npm run check` passed, all 93 unit tests passed, and the production build passed. All 21 browser scenarios passed across the prepared-baseline run and targeted follow-ups: the empty-brief scenario uses a separate fresh database, while prepared guidance and graph scenarios use the copied baseline. The two analytics tests passed against the final build. Desktop and 390px mobile screenshots were visually reviewed. No production restart or live inference was performed during implementation.

A follow-up request-scope regression test passed: an unscoped workflow completion produced no log row, while a scoped page event was recorded in a temporary directory.

The report omits records without a request ID, including five predeployment unit-test completion rows and internal dropped-event counters. Raw log files retain these rows unchanged; they do not count toward visitor activity.
