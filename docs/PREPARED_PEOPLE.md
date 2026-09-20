# Prepared People guidance

People profiles display stored conversation guidance on selection. The former generation button is removed. The existing source connections, recorded names, organization filters and erasure controls remain in place.

Preparation uses the original guidance task and verification pipeline. RELEX colleagues receive collaboration guidance; customers receive conversation guidance. The requesting employee's role, saved preferences and four recent private conversations still shape the result.

## Storage and scope

`wf_people_guidance` retains completed answers under workspace, project, employee, access level, erasure epoch, person and a SHA-256 context fingerprint. The fingerprint includes the permitted source records and the exact private context used by the original guidance workflow. Navigation, restart and the passage of time do not change it. Source updates or personal-memory changes select a new context without deleting previous completed rows.

The prepared baseline covers Ana at L1/L2/L3, Marco at L1/L2 and Nadia at L1: 18 people at L1, 18 at L2 and 20 at L3, totaling 110 guides. Baseline results are reused only for the same employee and level with identical evidence and private context. Existing personalized sessions prepare their own results. Opening People automatically queues all missing profiles in the current view. Failed preparations leave completed rows intact; the existing retry control retries the actual failed task.

Erasure removes prepared guidance only from the affected workspace, and its incremented epoch prevents any baseline reuse. A fresh-demo reset creates another workspace; it does not clear the earlier workspace or the baseline. The original erasure state remains intact.

## Durable operation

The service uses the fixed project working directory and `data/app.sqlite`, outside immutable `.releases/` builds. Startup creates missing tables and recovers interrupted jobs; it has no blanket reset, TTL or seed replacement for completed guidance. SQLite WAL and a five-second busy timeout accommodate the application and preparation workers. Preserve the entire data directory and its session signing key across deployment.

Run preparation from the project directory:

```sh
node --env-file-if-exists=.env --import tsx scripts/prepare-people.mts
```

The script appends outcomes to `data/people-preparation.jsonl` and skips existing valid results. Rerunning resumes missing or failed profiles without repeating completed calls. `PREPARE_WORKSPACE`, `PREPARE_OWNER` and `PREPARE_LEVEL` restrict a run; `PREPARE_PEOPLE` accepts exact names separated by `|`; `PREPARE_CONCURRENCY=1` reduces the default two workers. The configured Verda endpoint and original evidence verification remain in use. Guidance requests place the stable permitted evidence before the changing task and private context to support provider prefix reuse. Source content remains explicitly untrusted. Newly generated guides request 3–5 short paragraphs and at most 250 words; completed guides are preserved.

The live browser service has its own bounded background queue. After a process interruption, revisiting People queues any missing profiles whose interrupted job needs recovery. Completed guidance stays available even if inference is temporarily unavailable.

## Validation

Four focused deterministic checks cover context reuse and isolation, fresh-demo reset preservation, erasure exclusion, queue deduplication and interrupted preparation recovery. The full deterministic suite passes 75 tests, including three transport checks for one bounded fresh-connection retry, cancellation and a second socket failure. The public People browser workflow passes. Desktop and mobile captures show stored guidance with the generation button absent; mobile has no horizontal overflow. Generation is complete: all 110 baseline guides and 20 guides for an existing personalized Ana context are stored and readable.

All 13 answers completed before the first deployment retained their exact IDs after the service restarted. An additional 13 focused workflow/preparation tests passed after the guidance-only prompt ordering change.

## Completed preparation, 20 September

The final current-context read check completed at 08:30 UTC. Fresh workspace reads reused every baseline guide; the existing personalized Ana workspace also returned all 20 guides.

| Employee/view | L1 | L2 | L3 | Total |
| --- | ---: | ---: | ---: | ---: |
| Ana baseline | 18 | 18 | 20 | 56 |
| Marco baseline | 18 | 18 | — | 36 |
| Nadia baseline | 18 | — | — | 18 |
| Existing personalized Ana view | — | — | 20 | 20 |
| Total | 54 | 36 | 40 | 130 |

All 130 requested guides are available, with zero missing profiles. The journal records 13 unsuccessful earlier attempts, resolved through resume. The later 43-guide phase completed without a failed profile. Four concurrent inference requests were used, with all slots assigned to Ana until her 76 variants were ready. The remaining persona scopes followed. Preparation workers have exited.

The final persistence check compared answer IDs from the journal with SQLite: all 118 guides completed before the latest service deployment were still present afterward. This count includes additional guides generated automatically in browser sessions. The required 130-guide coverage is checked independently against each current scope and fingerprint, rather than inferred from a total row count. The local report is `data/people-preparation-verification.json`; the append-only journal is `data/people-preparation.jsonl`.

Fresh Chromium navigation on https://relio-ai.eu opened all 20 default Ana profiles, waited for each selected person's heading and stored guidance, and confirmed the old generation button was absent. Desktop and mobile captures are in `docs/screenshots/people-prepared-desktop.png` and `people-prepared-mobile.png`. Mobile had no horizontal overflow.

The page loader now reuses one scoped person snapshot per request. End-to-end profile HTTP samples remained around 2.3 seconds, so this change has no claimed measured page-speed gain. It introduces no cross-request identity cache. A new project or private-memory context prepares updated guidance automatically; the completed matching context remains durable.
