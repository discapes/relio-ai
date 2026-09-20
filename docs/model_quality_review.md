# Model quality review

The source-record repair and claim-selection changes recovered transcript memory across all 45 documents. A separate obligation check also changed P8 from an unsupported unfulfilled promise to a source-backed action that remained incomplete. The model still misses some relevant records and can overstate chronology completeness.

## Extraction failure and repair

The original extraction diagnostic produced 36 email claims with 59 record references. One transcript partition produced 35 claims with 39 document-only references. The application accepted the outer `claims` object, then removed every transcript claim because a document ID cannot resolve to a particular utterance. Its verifier received an empty list.

`modelJSON` now accepts nested output validation. Invalid references trigger one retry with the specific validation error and valid record-handle examples. Exact source existence is checked before independent evidence verification. A document ID is never mapped to an arbitrary utterance. The same validation applies to research inventories and answer verification.

The model also exceeded requested item counts. Keeping the first 25 claims preserved only the earlier documents in each partition. `boundedEvidenceEntries` now takes an entry from each represented document before taking additional entries from the same document. Research inventories have corresponding enforced limits.

The verifier previously copied `status: agreed` from its example output, including for text describing a proposal. Verification now uses stable candidate IDs and returns revised text and supporting records. The application retains the candidate's kind and temporal status; the verifier must remove candidates whose status is unsupported.

The first repaired extraction produced 75 verified claims covering 22 documents, including 50 transcript claims. Reusing its captured drafts with document-balanced selection and independent live verification produced 75 claims covering all 45 documents, including 41 transcript claims. The three final verification calls completed in 23.8 seconds. The resulting statuses were 34 agreed, 30 observation, five corrected, three outstanding, two proposed and one superseded.

These 75 entries were published to `prepared-baseline` at L3 using `replaceClaims`, with fresh claim IDs and validation against the production runtime sources. L1 and L2 retain 35 and 38 entries respectively. Prepared memory therefore contains 148 entries across the three access levels.

Evidence and reproduction:

- `model_quality_extraction.json` contains verified claims, document coverage and individual model outputs.
- `model_quality_extraction_drafts.json` contains the successful captured extraction outputs used for re-verification.
- `scripts/reverify-extraction.mts` runs the captured drafts through the current selection and live verification path in a fresh temporary database. It does not publish them.

Document coverage means each document supports at least one selected claim. It does not establish complete extraction of every fact or correct interpretation of every claim.

## Unfulfilled commitments

The earlier P8 answer took 327.1 seconds and selected obtaining a warehouse data field. It acknowledged that the actual promise to ask or chase had been fulfilled, then treated the missing desired outcome as the same obligation. A broad paragraph verifier repeated that interpretation.

Commitment research now represents the accepted action, owner, state, acceptance records and follow-up records separately. A state without follow-up evidence becomes unknown. Candidates are bounded and prioritised by state. A separate selection step requires an exact acceptance quotation and an exact later noncompletion quotation from selected candidate records. The final answer uses the selected obligation's source trail. An empty selection produces an evidence gap rather than a new unsupported choice.

The intermediate structured-inventory run took 51.2 seconds but selected a quarterly-review obligation despite evidence that its cadence was later established. That result is retained in `model_quality_p8_before_selection.json`. The first stricter-schema attempt exhausted its output allowance while retrying a candidate whose state lacked follow-up evidence; it is retained in `model_quality_p8_initial.json`.

With the selection check, the original P8 question completed in 51.0 seconds with 19 citations. It selected the unfinished removal of a personal reference: Marco accepted ownership on 17 November 2025, acknowledged incomplete work on 9 April 2026, and reported three of four locations completed on 16 June 2026. The acceptance and follow-up quotations match their original runtime records. The answer identifies Marco as owner and Katarina as the reviewer tracking the action.

The selected trail is supported, but the final answer omits the 19 November email promise, 12 March chase and 23 June follow-up. The email partition did not extract that candidate on this run. Consequently, the answer's claims about the latest instruction or absence of later records are too broad. The independent practice reference contains the fuller trail. The saved answer is retained exactly as generated, including punctuation artifacts subsequently addressed in rendering. Subsequent code passes the date of the selected follow-up checkpoint to both answer generation and verification, instructing them to limit status to that date and leave later events unverified. That wording change has deterministic checks but has not received another P8 model run.

`model_quality_p8.json` contains the final answer and all intermediate model outputs, timings and token usage. `scripts/quality-probe.mts` reruns the original question through ordinary chat in a fresh temporary database, using the configured inference endpoint. Selection quality and exact quote binding are separate checks: matching quotations alone cannot prove that two passages describe the same obligation.

## Verification

Focused checks cover invalid document references and retry feedback, unavailable record handles, commitment reference requirements, document-diverse selection, preservation of proposal status, and rejection of a fabricated noncompletion quotation. Existing workflow and privacy checks continue to cover access scopes, private context, source withdrawal and stale in-flight work.

Commands:

```sh
npm run check
npx tsx --test tests/model.test.ts tests/workflows.test.ts tests/privacy.test.ts
```

The check completed with zero errors and warnings. The final commitment-selection regression test passed. The release owner runs the complete suite and build after handoff.

P1 and P3 were rerun with their original prompts through the updated ordinary chat path. Their preceding results are preserved under `practice_before_quality/`.

- P1 completed in 84.9 seconds with six citations. It reports the exact 30 September email counts, but omits the workshop's 31% case-pack gap, clean store/product hierarchy, approximate cohort counts and deployment-scope figures. It incorrectly describes figures as later confirmed unchanged, although the later sources describe remediation completion and an approximate 1,300. Exhaustive coverage remains incomplete.
- P3 completed in 74.8 seconds with 22 citations. Its November 2025 speaker attribution and unresolved speaker treatment are supported. It misses the September 2024 removal proposal and incorrectly treats November as the earliest occurrence. Its statement that no other agreement is recorded is too broad.

These are remaining semantic and coverage failures. Exact reference validation prevents a document or unavailable record from being accepted as evidence; it does not establish completeness of source discovery or correct interpretation. No further complete practice run was performed.

## Latest controlled answers

The following answers are the actual generated outputs. They are included for inspection together with their source bindings. The review above identifies their remaining errors; the independent practice reference provides the fuller source-checked account.

### P1

Duration: 84.9 seconds.

On 30 September 2024, Kwame Boateng reported the master-data remediation scope for the pilot cohort with four figures: 4,214 articles in the cohort, 1,317 missing case pack quantity, 3,105 missing or default supplier lead, and shelf life populated at 48% . In the same message he assessed case pack as the blocker, said lead times can be worked around by deriving actuals from receipt history, and stated shelf life is out of scope for this phase . He also attached a file containing the 1,317 articles missing case pack quantity; that attachment itself is not available in the supplied evidence . [1]

The figures were later confirmed unchanged. On 20 December 2024 Ana Duarte recorded that shelf life remains at 48% and untouched, correct for this phase and set to become the critical path for phase two . On 21 January 2025 Priya Nair reported case pack for the cohort done, with 1,300 articles finished on 19 December 2024 , lead times untouched and still mostly sevens , and shelf life untouched and not in scope . [2] [3] [4] [5] [6]

| Citation | Source record                                                   | Date                | Author        |
| -------- | --------------------------------------------------------------- | ------------------- | ------------- |
| 1        | `emails/13_master-data-remediation#message-006`                 | 2024-09-30T10:05:00 | Kwame Boateng |
| 2        | `emails/13_master-data-remediation#message-002`                 | 2024-12-20T08:40:00 | Ana Duarte    |
| 3        | `transcripts/08_2025-01-21_uat-readiness-review#utterance-0003` | 2025-01-21          | Priya Nair    |
| 4        | `transcripts/08_2025-01-21_uat-readiness-review#utterance-0011` | 2025-01-21          | Priya Nair    |
| 5        | `transcripts/08_2025-01-21_uat-readiness-review#utterance-0012` | 2025-01-21          | Priya Nair    |
| 6        | `transcripts/08_2025-01-21_uat-readiness-review#utterance-0022` | 2025-01-21          | Priya Nair    |

### P3

Duration: 74.8 seconds.

Priya Nair, Acme's IT Integration Lead, raised the operator ID field (OP_ID) in the waste write-off records at the fresh Phase 2 go/no-go on 17 November 2025, explaining that the field identifies who scanned items out and that per-employee waste figures cannot leave Acme's estate without a works council consultation; she called it a condition rather than a request. [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11]

Nadia Haddad, RELEX Solution Consultant, agreed: on 17 November she committed to confirm the field name and exclude it at source, and on 19 November she confirmed in writing that OP_ID is dropped at the extract from the next run, which was Friday night. Her 19 November email is the only recorded written acceptance of the exclusion; no other actor's agreement is recorded in the supplied passages. [12] [13] [14] [15]

An unidentified "Unknown Speaker" said "Then we drop it at the extract" on 17 November, but the transcript does not identify that speaker and the remark cannot be attributed to anyone named. [16]

Yes, the field had already been sent outside the extract pipeline by then. Priya's 18 November email states OP_ID had been in every file since February and demands exclusion at source before the next extract run, and asks what had been done with the files already delivered. On 24 November Kwame Boateng reported that OP_ID sat in the raw landing zone for every daily file since 14 February, was not carried into the aggregated waste tables, but was present in row-level reconciliation extracts produced in June and September 2025 for the data quality review; two of those were emailed as attachments, once to Priya and once to a distribution list of nine people including three at Meridian, which Priya confirmed. Kwame stated he could purge the landing zone but not the emailed attachments. [17] [18] [19]

No record in the supplied passages shows Priya approving the landing-zone purge or closing the already-delivered-files question; her 18 November option to defer a complicated answer to the January session is the last stated position on that point. The exclusion itself was later tracked to closure: on 11 December 2025 Kwame reported the field was excluded at the extract from 21 November, confirmed in writing to Priya, who acknowledged receipt. [17] [19] [20] [21] [22]

| Citation | Source record                                                    | Date                | Author          |
| -------- | ---------------------------------------------------------------- | ------------------- | --------------- |
| 1        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0100` | 2025-11-17          | Priya Nair      |
| 2        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0101` | 2025-11-17          | Priya Nair      |
| 3        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0103` | 2025-11-17          | Priya Nair      |
| 4        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0104` | 2025-11-17          | Priya Nair      |
| 5        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0106` | 2025-11-17          | Priya Nair      |
| 6        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0108` | 2025-11-17          | Priya Nair      |
| 7        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0109` | 2025-11-17          | Priya Nair      |
| 8        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0112` | 2025-11-17          | Priya Nair      |
| 9        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0147` | 2025-11-17          | Priya Nair      |
| 10       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0149` | 2025-11-17          | Priya Nair      |
| 11       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0145` | 2025-11-17          | Priya Nair      |
| 12       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0151` | 2025-11-17          | Nadia Haddad    |
| 13       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0153` | 2025-11-17          | Nadia Haddad    |
| 14       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0154` | 2025-11-17          | Nadia Haddad    |
| 15       | `emails/07_op-id-field-exclusion#message-003`                    | 2025-11-19T11:44:00 | Nadia Haddad    |
| 16       | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0150` | 2025-11-17          | Unknown Speaker |
| 17       | `emails/07_op-id-field-exclusion#message-004`                    | 2025-11-18T08:20:00 | Priya Nair      |
| 18       | `emails/07_op-id-field-exclusion#message-002`                    | 2025-11-24T17:10:00 | Kwame Boateng   |
| 19       | `emails/07_op-id-field-exclusion#message-001`                    | 2025-11-24T17:55:00 | Priya Nair      |
| 20       | `transcripts/18_2025-12-11_fresh-cutover-call#utterance-0067`    | 2025-12-11          | Ana Duarte      |
| 21       | `transcripts/18_2025-12-11_fresh-cutover-call#utterance-0068`    | 2025-12-11          | Kwame Boateng   |
| 22       | `transcripts/18_2025-12-11_fresh-cutover-call#utterance-0069`    | 2025-12-11          | Priya Nair      |

### P8

Duration: 51.0 seconds.

At the Fresh Phase 2 go/no-go on 2025-11-17, Sofia Almeida asked that the health reference about her be removed from project documentation, saying it had followed her around for two years, and asked that the other places it appears be found (, ). Marco Rossi accepted the removal with 'We will take it out' and accepted ownership with 'I will own that' . Lena Fischer asked that it be followed up properly, not just in the meeting's notes (, ). [1] [2] [3] [4] [5] [6]

At the data protection and security review on 2026-04-09, Marco Rossi reported that a request had come in November from one of Katarina Voss's colleagues to remove a health reference from the notes , and that it had been removed from the notes they knew about, but he committed to finding the others and had not closed that out (, ). Katarina Voss observed that it was April by then . [7] [8] [9] [10]

At the Q2 quarterly business review on 2026-06-16, Ana Duarte raised the item as one to close from the last review, noting Sofia's November request to have a personal detail removed from the documentation (, ). Marco Rossi reported it still not fully closed, with three of four locations done and the fourth being a document version (, ). Sofia Almeida noted it had been seven months , and Marco Rossi acknowledged it had been seven months and said he did not have a better answer (, ). Marco Rossi noted that Katarina Voss has it as an open action , and Robert Kahn directed 'Then close it' . No later record in the supplied archive shows the fourth location completed. [11] [12] [13] [14] [15] [16] [17] [18] [19]

Marco Rossi was the accepted owner of the action from the outset , so he was the person who needed to notice it remained open. Lena Fischer explicitly asked for proper follow-up at the time of the agreement , and by June 2026 Katarina Voss held it as an open action . [4] [6] [18]

Recommendation: assign a dated deadline for completing the fourth location (the document version) and confirm closure at the next review, since the action has been open since November 2025, was still incomplete in June 2026, and Robert Kahn's June 2026 direction to close it is the latest recorded instruction (, , ). [13] [14] [19]

| Citation | Source record                                                     | Date       | Author        |
| -------- | ----------------------------------------------------------------- | ---------- | ------------- |
| 1        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0077`  | 2025-11-17 | Sofia Almeida |
| 2        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0078`  | 2025-11-17 | Marco Rossi   |
| 3        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0091`  | 2025-11-17 | Sofia Almeida |
| 4        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0096`  | 2025-11-17 | Lena Fischer  |
| 5        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0097`  | 2025-11-17 | Lena Fischer  |
| 6        | `transcripts/17_2025-11-17_fresh-phase2-go-no-go#utterance-0098`  | 2025-11-17 | Marco Rossi   |
| 7        | `transcripts/21_2026-04-09_data-protection-review#utterance-0088` | 2026-04-09 | Marco Rossi   |
| 8        | `transcripts/21_2026-04-09_data-protection-review#utterance-0091` | 2026-04-09 | Marco Rossi   |
| 9        | `transcripts/21_2026-04-09_data-protection-review#utterance-0093` | 2026-04-09 | Marco Rossi   |
| 10       | `transcripts/21_2026-04-09_data-protection-review#utterance-0096` | 2026-04-09 | Katarina Voss |
| 11       | `transcripts/22_2026-06-16_q2-business-review#utterance-0108`     | 2026-06-16 | Ana Duarte    |
| 12       | `transcripts/22_2026-06-16_q2-business-review#utterance-0109`     | 2026-06-16 | Ana Duarte    |
| 13       | `transcripts/22_2026-06-16_q2-business-review#utterance-0111`     | 2026-06-16 | Marco Rossi   |
| 14       | `transcripts/22_2026-06-16_q2-business-review#utterance-0113`     | 2026-06-16 | Marco Rossi   |
| 15       | `transcripts/22_2026-06-16_q2-business-review#utterance-0117`     | 2026-06-16 | Sofia Almeida |
| 16       | `transcripts/22_2026-06-16_q2-business-review#utterance-0118`     | 2026-06-16 | Marco Rossi   |
| 17       | `transcripts/22_2026-06-16_q2-business-review#utterance-0119`     | 2026-06-16 | Marco Rossi   |
| 18       | `transcripts/22_2026-06-16_q2-business-review#utterance-0125`     | 2026-06-16 | Marco Rossi   |
| 19       | `transcripts/22_2026-06-16_q2-business-review#utterance-0127`     | 2026-06-16 | Robert Kahn   |
