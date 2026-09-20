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
node --import tsx scripts/prepare-people.mts
```

The script appends outcomes to `data/people-preparation.jsonl` and skips existing valid results. Rerunning resumes missing or failed profiles without repeating completed calls. `PREPARE_WORKSPACE`, `PREPARE_OWNER` and `PREPARE_LEVEL` restrict a run; `PREPARE_CONCURRENCY=1` reduces the default two workers. The configured Verda endpoint and original evidence verification remain in use. Guidance requests place the stable permitted evidence before the changing task and private context to support provider prefix reuse. Source content remains explicitly untrusted. Newly generated guides request 3–5 short paragraphs and at most 250 words; completed guides are preserved.

The live browser service has its own bounded background queue. After a process interruption, revisiting People queues any missing profiles whose interrupted job needs recovery. Completed guidance stays available even if inference is temporarily unavailable.

## Validation

Four focused deterministic checks cover context reuse and isolation, fresh-demo reset preservation, erasure exclusion, queue deduplication and interrupted preparation recovery. The full deterministic suite passes 72 tests. The public People browser workflow passes. Desktop and mobile captures show stored guidance with the generation button absent; mobile has no horizontal overflow. The 110 baseline guides and 20 guides for an existing personalized browser context are being prepared resumably. Final batch counts are recorded when generation completes.

All 13 answers completed before the first deployment retained their exact IDs after the service restarted. An additional 13 focused workflow/preparation tests passed after the guidance-only prompt ordering change.
