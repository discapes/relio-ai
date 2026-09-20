# Receipt — one-page design

Receipt gives RELEX employees a personal morning brief and a shared, source-backed memory of their customer project. A visible project agent receives emails in Cc, remembers delivered information and contributes when the model judges that a reply would materially help the conversation. An employee-side Outlook simulator demonstrates collection and participation.

## Inputs and flow

The Acme seed contains 45 documents: 110 emails, 25 report updates and 2,839 transcript utterances. Parsed JSON is imported into isolated SQLite runtime workspaces. Source IDs, authors, dates and message/utterance positions survive import. New simulated mail reaches shared memory when addressed to the project agent.

`Permitted sources → model interpretation and verification → saved claims, answers and briefings → inspectable source receipts`

SvelteKit and TypeScript provide the product and server workflows. SQLite stores sources, derivatives, employee preferences, email, jobs and erasure state. Ordinary questions use full permitted context; complex research first inventories source partitions. Document-grouped extraction produces dated claims. The graph links claims to sources and related claims from the same discussion.

## Provenance, attribution and currency

A model verification pass checks draft answers against cited passages and neighbouring transcript turns. The server binds references to available source IDs and attaches exact runtime text. Instructions preserve proposals versus approvals, signatories, effective scope, later corrections and evidence gaps. Source dates remain separate from generation time. The UAT example must retain the 25-store ambient/dry-goods scope, fresh exclusion and Lena's confirmation; the signed attachment is absent.

## Access and private memory

Project membership and cumulative levels are enforced before model input: L1 customer-shareable, L2 RELEX internal and L3 restricted. Historical assignments use audience/document metadata under a demo policy. Customer cards and external email use fresh L1 context. Employee-owned preferences and conversation customise briefs and meeting preparation; email participation and customer sharing exclude them. Demo persona controls represent future identity integration.

## Autonomous work

Saved briefs use persistent jobs, source/preference-triggered refresh and daily checks after 06:00 Helsinki time. The email model decides whether useful participation warrants a reply; routine exchanges can receive silence. Server controls handle audience scope and duplicate prevention. Calendar events are simulated and may be derived from explicitly scheduled incoming messages. Stakeholder guidance separates observed evidence from recommendations.

## Deletion propagation

Authorised erasure removes personal authored evidence, identifying passages and recipient metadata from runtime copies. It clears derived claims/answers, removes affected personal/mail state and blocks old inference results through an incremented epoch. A receipt records counts without the person's name. Hashed identifier suppression persists across restart. Independent surviving evidence remains answerable with other people named.

The operation covers one application workspace. Original fixtures, other workspaces, downloaded exports and infrastructure-managed caches/backups have separate boundaries. Reset starts a new workspace. Alias/pronoun handling is heuristic; conservative withdrawal can remove additional context.

## Location and validation

The application host and team-provided GLM-5.3-Flash deployment are in Helsinki. Inference uses the SSH-tunnel endpoint `http://127.0.0.1:8000/v1`. Email transport, calendar and sign-in are demonstration integrations. Semantic interpretation remains a model judgment. Final evidence belongs in [VALIDATION.md](VALIDATION.md); submission companions are the [reviewed practice answers](practice_reference.md), [latest generated evaluation and limitations](model_quality_review.md), [solution guide](SOLUTION.md) and [pitch](PITCH.md).
