# Receipt: project memory for the Acme account

Receipt helps a RELEX employee prepare for customer work, recover the scope of earlier decisions and contribute useful evidence to email conversations. Its main screen is a personal workspace with a saved morning brief, questions and meeting preparation. Shared project memory connects those outputs to original messages and transcript passages.

Receipt is deployed at https://receipt-workspace.hai1.iffe.eu. This document describes the implementation and measured boundaries on 20 September 2026. Deployment details and commands belong in the [README](../README.md); completed checks and outstanding acceptance work belong in [VALIDATION.md](VALIDATION.md). Feature descriptions here explain the implementation and user path; validation requires observed results.

## Using the workspace

Open **My workspace** as Ana Duarte. Her prepared brief draws on permitted Acme evidence, her role, personal preferences and simulated meetings. Generation time and archive coverage are visible. Ask a follow-up in the workspace conversation, then open a numbered receipt to inspect the source's author, date and position.

Personal memory stores followed topics and goals for the selected employee. Add, edit or forget a preference through its controls, or ask the assistant to remember a goal in conversation. For example: “Follow bakery integration and highlight decisions needed from Acme.” Saved preferences influence subsequent preparation. The personal assistant can use recent private conversation. Email participation and customer cards receive separate contexts excluding private history and preferences.

The calendar panel contains explicitly simulated meetings. **Prepare for this meeting** generates a preparation note using project evidence. Delivered emails can add a simulated calendar item when the message explicitly schedules an event. People pages show source-linked identities, roles and organizations established from recorded email domains. Filter by RELEX, Acme customer, Meridian partner or unconfirmed organization. Customer preparation covers expressed priorities and proposals; colleague preparation covers responsibilities, decisions and handoffs. Recorded names in source bodies, headers, surrounding conversation, email messages, calendar entries, claims and answers open the corresponding People profile. Matching uses the currently permitted identities; shared aliases remain plain text. Organization labels remain unconfirmed when email evidence is absent or conflicts.

**Project memory** provides source search, extracted decisions, commitments, questions and corrections. Its graph shows a selected claim's supporting passages. Related claims are grouped by shared source document; this relationship alone cannot establish supersession. Open the underlying passages to inspect the relationship.

A customer evidence card is generated from L1 sources in a separate request. Preview the answer and receipts, copy its text or download a PNG. Stored answers retain their source references. Downloaded copies remain under the recipient's control.

## The email demonstration

**Email demo** represents the selected employee's Outlook mailbox alongside the product. Message transport stays inside the application. The agent address is `acme-memory@relexsolutions.example`.

The mailbox shows historical messages where the employee appears as sender or recipient, subject to the selected access level. Compose a new message or continue a thread. **Include project memory** visibly adds the agent to Cc. Without the agent, a new message stays in the simulator mailbox. When addressed, the agent receives that body, including any explicitly included history. Earlier simulator-only messages remain outside ingestion.

The participation task asks the model to respond to direct questions and intervene when it can resolve an important uncertainty or prevent a consequential misunderstanding. It also asks the model to respect participants' attention and stay silent during routine exchanges. The model makes that decision. The server determines permitted evidence, validates references, stores the reply and prevents duplicate delivery effects. Replies appear in the same thread and retain their original source dependencies.

The editable examples demonstrate a bakery meeting update and an incorrect assertion that January's UAT sign-off covered the whole programme. Sending an example invokes the actual application workflow. The controls supply message text; the model generates its response. Historical support is recorded in [demo_scenarios.md](demo_scenarios.md).

The collection assumption is visible participation: a message addressed to the agent joins shared project memory at its assigned level. CC visibility expresses this product convention. Legal consent and organisational sharing policy require separate decisions.

## Data and inference

The organisers supplied a synthetic archive of 45 documents covering March 2024 through 2 July 2026. Parsed input contains 110 email messages, 25 report updates and 2,839 transcript utterances: 2,974 source records. JSON is imported into per-workspace SQLite runtime copies. Original IDs, authors, local dates, message positions and available transcript timestamps remain attached.

SvelteKit and TypeScript provide server loads, form actions and the browser interface. Node's SQLite driver stores sources, extracted claims, personal preferences, generated artifacts, email, meetings, jobs and erasure receipts. Sources and claims carry project/access scope. Generated artifacts also carry an owner and erasure epoch.

The application host and team-provided inference deployment are in Helsinki. The configured API is `http://127.0.0.1:8000/v1`, reached through the host's SSH tunnel. The model is `glm-5.3-flash`; `INFERENCE_URL` and `INFERENCE_MODEL` override defaults. Permitted evidence is sent to that endpoint. Application code alone cannot establish the inference service's logging, cache retention or backup policy.

Ordinary questions use full permitted source context. Exhaustive and chronology questions first build an inventory from document partitions, then answer from relevant original records and neighbouring turns. Extraction prepares dated claims from document groups. A further model pass reviews proposed claims against cited original passages before publication. Record-level validation rejects document-only references and requests bounded repair. Document-balanced selection preserves coverage across the supplied archive. These model steps can still omit or misinterpret evidence; practice evaluation records those failures.

Inline citation chips open the exact numbered excerpt. The evidence panel groups excerpts by document or meeting and joins consecutive transcript turns into passages. Groups start collapsed, retaining every underlying receipt for inspection. Text and PNG exports preserve the original numbered references.

An answer is drafted and checked against cited passages and neighbouring transcript turns. The server attaches exact runtime passages and assigns citation numbers. The verification task preserves approval scope, attribution, changes and evidence gaps. Deterministic source binding and model interpretation serve different purposes: semantic errors remain possible, and receipts support inspection. Missing attachments remain unavailable evidence. Untimed or unresolved speakers retain their source position and uncertainty.

## Access and personal ownership

| Level | Sources available to a project member |
| ----- | ------------------------------------- |
| L1    | Customer-shareable material           |
| L2    | L1 plus RELEX internal material       |
| L3    | L1 and L2 plus restricted material    |

The server selects evidence before constructing model input. Source endpoints, search, claims, mailbox messages and artifacts apply the selected context. Customer cards and externally addressed email use L1. Known internal recipients use the least permitted clearance, capped at L2; unknown recipients receive L1 treatment. The simulator's email delivery supports L1 and L2.

Historical classification uses message audiences and internal/restricted document metadata. The assignments are application policy assumptions because authoritative access annotations are absent from the archive. Production use requires an organisation-owned classification policy and identity integration.

Demo controls select a server-defined employee and clearance: Ana has L3 and erasure permission, Marco has L2, Nadia has L1, and a fourth identity belongs to another project. These controls represent the identity-provider boundary. Personal preferences and conversations belong to their employee within the browser's workspace. Explicitly sharing a private note previews its content and chosen level, then creates an attributed shared source.

## Prepared work and time

SQLite jobs persist queued work and processing errors. The scheduler checks for a daily brief refresh after 06:00 Europe/Helsinki while the application runs. Preference changes and delivered email queue refreshed preparation. A prepared baseline generated through the same pipeline can supply matching initial briefs and claims before an employee customises the workspace.

Mail has a dedicated processing lane alongside background brief and extraction work. Model calls have bounded concurrency and a timeout. Restarted running jobs are marked failed for retry; queued jobs resume when the worker is activated. Errors expose retry controls. A previous saved brief can remain available during regeneration.

The scenario date is Monday 6 July 2026. New example mail and calendar entries are simulated continuations of the archive. Source dates, scenario dates and actual generation timestamps describe different events. Source dates without timezone information retain that ambiguity. The current mail simulator assigns fixed scenario timestamps.

## Erasure and reset

An authorised L3 user can erase a selected person from **People**. The application resolves names, known aliases, addresses and available identifying details from runtime evidence. It removes authored sources, identifying passages and matching recipient metadata. A bounded context heuristic also withdraws nearby pronoun references. Unrelated surviving passages remain available with other people named.

The operation clears extracted claims and generated answer artifacts in that workspace, removes affected simulator/personal state and the erased employee's owned state, cancels active inference calls and increments the erasure epoch. A generation started under the previous epoch cannot publish. Later answers and source viewers use cleaned runtime copies.

The receipt records actual removal counts and time without repeating the deleted identity. Hashed suppression tokens persist to reject known erased identifiers. SQLite secure deletion is enabled and erasure checkpoints the write-ahead log. Conservative withdrawal can remove additional context, and alias/pronoun heuristics require evaluation for difficult identities. The hashes are suppression metadata with their own retention purpose.

Erasure covers application-owned data in the selected workspace. Protected challenge fixtures, separate demo workspaces, downloaded text/PNG and infrastructure-controlled inference caches or backups have distinct boundaries. Reset creates a new workspace seeded from historical fixtures; the previous workspace retains its erased state. This supports repeatable presentation alongside an independent judge session.

## Review and submission

The [one-page design](DESIGN.md) summarises the challenge mechanisms. The [pitch](PITCH.md) provides the five-minute walkthrough and question preparation. [Practice answers](PRACTICE_ANSWERS.md) require review against original evidence; successful generation alone does not establish correctness.

The validation record includes live email participation and silence, refreshed briefings, customer export, multiple-person deletion, surviving adjacent sources, fresh public browser modes and restart persistence. Practice evaluation separately identifies incomplete inventories and attribution errors. Direct workflows have measured tens-of-seconds latency; complex partitioned research can take several minutes.
