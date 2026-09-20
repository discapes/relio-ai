# Page-load performance

On 20 September 2026, the Charlotte Meyer People data request took 1.48–1.59 seconds from vai1 and 1.50–2.29 seconds directly on localhost. Overlapping requests reached 4.47 seconds. The service already used a production SvelteKit build and NODE_ENV=production. The host had spare CPU and memory capacity.

Profiling isolated People discovery at approximately 1,000 ms. The algorithm normalized the same source text, authors and participants for each person. It now normalizes each source once and indexes authors and participant email addresses for the duration of that calculation. The complete People output, including ordered aliases and evidence IDs, matches the original output at all three access levels.

The synchronous page loader also reuses source and People reads within its own execution. Keys include workspace, project, persona, clearance and erasure epoch. SQLite data_version and total_changes invalidate these reads after writes from this connection or another connection. Access checks still run before reuse. The scope ends when the synchronous loader returns or throws; asynchronous background work reads fresh data. No cached project data survives between page loads.

Validation used an isolated checkout and production server on localhost port 42937, with a scoped copy of the supplied workspace and prepared guidance. The same Charlotte request took 134–146 ms after optimization. Production remains on port 34342.

The deterministic suite contains 80 tests. A reviewer test initially needed the corpus path linked into the isolated checkout's parent; it passed on rerun. Five new tests cover full-corpus output equivalence, workspace/access boundaries, writes by another SQLite connection, erasure and scope lifetime. Guidance fingerprints also matched before and after the algorithm change.

To repeat the local computation profile with a temporary database:

```sh
node --import tsx scripts/profile-workspace.mts
```

This reports People discovery, workspace assembly and the People load flow. The first sample includes runtime warmup. It disables model background jobs and removes its temporary database afterward.

The release was deployed at 11:40 EEST on 20 September. All 13 browser workflows passed. A live Chromium check confirmed Charlotte guidance, mobile layout without horizontal overflow, and the supplied slides PDF. Production checks from vai1 returned HTTP 200 in 0.26–3.37 seconds; live contention still causes occasional delays beyond the isolated request cost. The first request after restart took 1.03 seconds locally through HTTPS.
