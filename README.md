# Receipt

Receipt gives RELEX employees a prepared Acme project briefing, a private assistant and shared project memory with source receipts. The email demonstration represents the employee's Outlook: adding the visible project agent in To/Cc delivers a message into shared memory and lets the agent decide whether a reply would help.

Application: https://receipt-workspace.hai1.iffe.eu · fixed port **34342**.

Judges can open **How it works → Submission documents** for the design, reviewed practice answers, actual generated evaluations and validation. These source-bearing reference documents require Acme L3 and are withdrawn after erasure in that workspace.

## Run

Requires Node 24.18+, the parsed sibling repository `../corpus_parsed/acme`, and the Helsinki inference endpoint at `http://127.0.0.1:8000/v1` with `glm-5.3-flash`.

```sh
npm install
npm run build
npm start
```

`DATA_DIR` defaults to `./data`. `CORPUS_DIR`, `INFERENCE_URL`, `INFERENCE_MODEL`, `HOST`, `PORT` and `ORIGIN` can be set in `.env`. Keep the inference URL on the approved Helsinki infrastructure. Port 8000 is the existing SSH forward; this application does not manage it.

Prepare reusable role-specific briefs and model-derived memory before a presentation:

```sh
DISABLE_BACKGROUND=1 npx tsx scripts/prepare.mts
```

Preparation uses full permitted source text and publishes verified batches. New browser workspaces copy the prepared baseline at their level. Personal preferences and later email updates trigger their own persisted refresh jobs. Failed jobs expose retry controls. A daily refresh runs after 06:00 Europe/Helsinki while the service is running.

## Use

Start on My workspace. Inspect a source receipt, save a followed topic or ask an arbitrary project question. Project memory provides full-archive search, a claim list and a graph connecting claims to supporting records. People provides attributed source records, generated stakeholder guidance and authorised deletion.

Email demo is a simulator with editable recipients and message content. Use the bakery scheduling example to add knowledge or the UAT example to demonstrate a useful intervention. Messages without the project agent stay in the employee's simulated mailbox. Model processing is visible and can continue while you navigate.

Demo controls switch the simulated employee/access level. Ana has L3 and erasure rights; Marco has L2; Nadia has L1; the colleague persona belongs to another project. These controls represent the production identity-provider boundary. Each browser has an isolated persisted workspace. Starting a fresh demo creates a separate workspace and preserves the old one.

## Checks

```sh
npm run check
npm test
npm run build
npm run test:e2e
```

Browser tests own port 34342 and use isolated test data with inference jobs disabled. To test an already running server, set `PLAYWRIGHT_BASE_URL`; this uses the server's configured data. Live evaluation is separate:

```sh
DISABLE_BACKGROUND=1 npx tsx scripts/evaluate-practice.ts
```

Reviewed submission answers for all nine practice questions are in `docs/practice_reference.md`. Actual generated answers remain in `docs/PRACTICE_ANSWERS.md`; `docs/practice_review.md` records earlier semantic limitations, and `docs/model_quality_review.md` contains the latest controlled P1/P3/P8 results and exact-record extraction review. `docs/VALIDATION.md` records actual outcomes, failures and limitations.

## Appearance

The interface uses RELEX navy, blue and pale blue with locally bundled Figtree. Status colors distinguish agreed, proposed, stale and corrected claims. Graphs and exported evidence images share the palette. See [branding and font attribution](docs/BRANDING.md) for tokens, source references and isolated visual-review operations.

## Operations

The systemd user unit is `receipt-workspace.service` and runs Node on the host. Source configuration is in `deploy/receipt-workspace.service`. Use `systemctl --user status receipt-workspace`, `systemctl --user restart receipt-workspace`, and `journalctl --user -u receipt-workspace -n 100` for operations. SQLite state is in `data/app.sqlite`; preserve this directory across deployment.

Deploy updates with `node scripts/deploy.mjs`. It builds an immutable release, atomically switches `.releases/current`, and restarts the service. Running browser assets remain tied to their release while the next version builds. Runtime SQLite data stays outside release directories.

Interrupted running jobs become visible failed jobs on restart; queued jobs resume when the application is opened. Retry a failed brief/extraction from the workspace or a failed email from its thread. A model outage leaves previous valid dated briefs available. Inference-generated prose can still need correction; source receipts and the full archive remain available for inspection.

See `docs/SOLUTION.md`, `docs/DESIGN.md`, `docs/PITCH.md` and `docs/demo_scenarios.md` for architecture, submission design and the demonstration.
