# Reviewed practice answers

These answers were checked against the parsed source records and original archive. They are independently reviewed submission answers and evaluation references, rather than unedited model output. Actual generated answers and measured limitations are preserved in [PRACTICE_ANSWERS.md](PRACTICE_ANSWERS.md) and [practice_review.md](practice_review.md). The archive ends on 2 July 2026. Record IDs identify exact email messages and transcript utterances; timestamps below are elapsed meeting positions. Source dates have no recorded timezone. Attachments mentioned in emails are unavailable in the supplied archive.

## P1. September master-data assessment

The assessment identified remaining gaps; the September evidence does not establish completion of remediation.

| Figure or finding                                                                                                             | Evidence                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Case-pack quantity missing on 31% of active articles                                                                          | Kwame, 24 September, 03:22–03:31, utterances 12–14                                         |
| Store master and product hierarchy described as clean                                                                         | Kwame, 03:50–04:01, utterances 17–19                                                       |
| Supplier lead times populated, with many defaulted to exactly seven days and considered unreliable                            | Kwame, 04:01–04:22, utterances 19–22; Priya confirms the defaulting at 04:29, utterance 23 |
| Shelf life populated on 48%                                                                                                   | Kwame, 04:39, utterance 25                                                                 |
| Approximately 4,200 articles in the pilot cohort                                                                              | Kwame, 05:44, utterance 37                                                                 |
| Approximately 1,300 case-pack fixes discussed                                                                                 | Priya, 05:58–06:07, utterances 41–43; the preceding attempted count by Kwame is incomplete |
| Exact pilot-cohort count: 4,214; missing case pack: 1,317; missing or default supplier lead: 3,105; shelf life populated: 48% | Kwame's 30 September email, message 6                                                      |

The workshop also reduced the pilot from 40 to 25 stores across three regions and mixed formats. Lena states the reduction at 08:14–09:00, utterances 68–75; Ana undertakes to reissue the plan at 09:59–10:15, utterances 87–90. Those figures describe deployment scope rather than data completeness.

Sources: [Master data workshop, 24 September 2024](../../materials/corpus/acme/transcripts/06_2024-09-24_master-data-workshop.txt), IDs `transcripts/06_2024-09-24_master-data-workshop#utterance-0012` onward; [Master-data remediation](../../materials/corpus/acme/emails/13_master-data-remediation.txt), `emails/13_master-data-remediation#message-006`, 30 September 2024, 10:05.

## P2. Ordering service levels

The 12 November 2024 ordering-logic workshop records Lena describing the existing theoretical target as 99% on everything, Tomas referring to 98% and 95% as a reduction, and Lena saying “Fine. Agreed.” The recorded passage supports agreement to those two target figures for the pilot discussion. It leaves the mapping of each target to product classes or categories unspecified. The agent should preserve this gap rather than assign 98% to one category and 95% to another.

The same passage records daily ordering, daily delivery on fast lines and twice-weekly delivery below that. These delivery frequencies do not establish the missing target-to-category mapping.

Source: [Ordering logic design workshop](../../materials/corpus/acme/transcripts/07_2024-11-12_ordering-logic-design.txt), 12 November 2024: utterance 73 at 06:34 (99%); utterances 77–79 at 06:49–06:59 (98% and 95%); utterance 83 at 07:25 (Lena's agreement); utterance 86 at 07:42 (ordering/delivery frequency). IDs follow `transcripts/07_2024-11-12_ordering-logic-design#utterance-0073`.

## P3. Operator ID removal and prior distribution

There are two distinct stages.

On 24 September 2024, Kwame identified an operator identifier in the extract he had already received. Priya proposed taking it out at 12:01. Kwame had said he did not need to receive it; Ana recorded the action, and Lena said “Yes” during the exchange. Priya said she would put the change on her list. The received extract establishes prior delivery to RELEX by that meeting.

On 17 November 2025, Priya raised the continuing inclusion of OP_ID as a condition of proceeding. Nadia acknowledged receipt and committed to exclusion at source and written confirmation. An unidentified speaker also says the field should be dropped; the system must preserve that speaker's unresolved identity. Lena welcomed the correction, and the closing recap records exclusion and written confirmation.

The 18 November email states that OP_ID had appeared in every file since February. Nadia confirmed on 19 November that it would be excluded from the next run, Friday night. Kwame's 24 November investigation located it in daily raw landing-zone files since 14 February, and in June and September row-level reconciliation extracts. Two extracts had been emailed: one to Priya and one to nine recipients including three at Meridian. He reported that aggregated waste tables did not carry the field. At the 11 December cutover meeting, he confirmed exclusion from 21 November; Priya acknowledged the written confirmation.

Sources:

- [24 September workshop](../../materials/corpus/acme/transcripts/06_2024-09-24_master-data-workshop.txt), utterances 99–119, 11:03–12:46.
- [17 November go/no-go](../../materials/corpus/acme/transcripts/17_2025-11-17_fresh-phase2-go-no-go.txt), utterances 127–163, 10:39–13:40; closing recap at utterances 169–171, 14:07–14:22.
- [OP_ID field exclusion](../../materials/corpus/acme/emails/07_op-id-field-exclusion.txt), messages 4, 3 and 2, dated 18, 19 and 24 November 2025.
- [11 December cutover](../../materials/corpus/acme/transcripts/18_2025-12-11_fresh-cutover-call.txt), utterances 67–69, 05:48–06:01.

## P4. UAT sign-off scope

Lena Fischer confirmed signing the limited core-replenishment UAT scope on 22 January 2025. Ana's 21 January email states:

> Acme Org confirms that user acceptance testing for core replenishment has been completed satisfactorily for the 25 store pilot cohort, covering ambient and dry goods categories. This sign-off does not extend to fresh categories, which remain in scope for a later phase, and does not constitute acceptance of the overall programme.

Lena's response says “Signed and attached” and confirms the wording. The email supports the signatory and scope; the actual signed attachment is unavailable. Two rounding defects were still open when the wording was sent; Kwame reported them fixed and retested on 24 January, with nine of nine scenarios passing. That later defect closure does not expand the signed scope.

Source: [UAT sign-off](../../materials/corpus/acme/emails/15_uat-signoff.txt), `emails/15_uat-signoff#message-003` (21 January, Ana), `#message-002` (22 January, Lena), `#message-001` (24 January, Kwame).

## P5. Shelf-life population over time

| Date              | Figure and interpretation                                                    | Source                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 20 March 2024     | “Maybe half the range”; an estimate, with ownership problems                 | Solution-demo workshop, Sofia, utterances 49–52, 05:45–06:09                                             |
| 18 April 2024     | “Maybe half”; some populated values were wrong                               | Technical due diligence, Priya, utterances 105–107, 09:21–09:33                                          |
| 24 September 2024 | 48% populated                                                                | Master-data workshop, Kwame, utterance 25, 04:39                                                         |
| 30 September 2024 | 48% in the written pilot-remediation summary                                 | Master-data remediation, message 6                                                                       |
| 20 December 2024  | Still 48%, untouched during phase one                                        | Master-data remediation, Ana, message 2                                                                  |
| 27 February 2025  | Described as still mostly empty, without a new numerical measurement         | Go-live cutover, Priya, utterances 15–20, 01:22–01:50                                                    |
| 12 September 2025 | Sofia repeats her March account: about half, some wrong                      | Fresh escalation, utterances 62–66, 05:34–06:06; this is a retrospective account rather than a new audit |
| 11 December 2025  | 61% for the three in-scope categories, up from 48% after the October cleanup | Fresh cutover, Kwame, utterances 50–54, 04:19–04:44                                                      |

The latest explicit measurement is 61% for produce, dairy and chilled ready meals. Its denominator is the three categories in scope; the archive does not establish a current whole-estate or all-category percentage. Population also says nothing by itself about correctness or the availability of remaining shelf life. The field-mapping thread distinguishes total shelf life in MHDHB from remaining shelf life and documents the approximation.

Sources: [March demo](../../materials/corpus/acme/transcripts/01_2024-03-20_solution-demo-value-workshop.txt), [April due diligence](../../materials/corpus/acme/transcripts/02_2024-04-18_technical-due-diligence.txt), [September workshop](../../materials/corpus/acme/transcripts/06_2024-09-24_master-data-workshop.txt), [remediation email](../../materials/corpus/acme/emails/13_master-data-remediation.txt), [February cutover](../../materials/corpus/acme/transcripts/10_2025-02-27_go-live-cutover.txt), [September escalation](../../materials/corpus/acme/transcripts/15_2025-09-12_fresh-phase2-escalation.txt), [December cutover](../../materials/corpus/acme/transcripts/18_2025-12-11_fresh-cutover-call.txt), [field mapping](../../materials/corpus/acme/emails/01_shelf-life-field-mapping.txt).

## P6. Bakery scope

Bakery was included in the initial fresh-phase discussion. At the 15 July 2024 kickoff, Lena listed produce, dairy, bakery and chilled ready meals. By the 17 November 2025 go/no-go, bakery's performance and in-store production needs prompted Sofia to propose removing it. Lena explicitly decided to go live with produce, dairy and chilled ready meals and handle bakery separately. The December cutover preserves that exclusion.

In January 2026, bakery became a separate partner workstream: RELEX supplies a demand signal and Meridian owns production planning. The March design discussion specifies a daily forecast with a fixed intraday profile, with morning and afternoon windows for baked lines. It explicitly distinguishes this agreed mechanism from a true intraday forecast. The June business review still describes bakery as in build with Meridian.

The current archive position is therefore a separate bakery workstream under development. Bakery is outside the three-category fresh release that went live in December 2025.

Sources:

- [Implementation kickoff](../../materials/corpus/acme/transcripts/05_2024-07-15_implementation-kickoff.txt), utterance 116, 13:05.
- [Fresh go/no-go](../../materials/corpus/acme/transcripts/17_2025-11-17_fresh-phase2-go-no-go.txt), utterances 30–49, 02:49–04:26, especially Lena's decision at 04:14.
- [Fresh cutover](../../materials/corpus/acme/transcripts/18_2025-12-11_fresh-cutover-call.txt), utterance 7, 00:41; speaker unresolved.
- [Bakery scoping](../../materials/corpus/acme/transcripts/19_2026-01-28_bakery-scoping-PARTNER.txt), utterances 43–51, 03:32–04:14.
- [Bakery design](../../materials/corpus/acme/transcripts/20_2026-03-17_bakery-design-workshop.txt), utterances 49–86, 03:57–07:09.
- [Q2 business review](../../materials/corpus/acme/transcripts/22_2026-06-16_q2-business-review.txt), utterances 94–96, 07:50–08:07.

## P7. Answering P1 after deletion

A direct runtime erasure check removed 115 source records from a fresh workspace. The check examined actual surviving runtime records after deletion. It used no model-generated answer or cache.

The September workshop's authored assessment figures and the 30 September assessment email were removed. Consequently, this workspace cannot cite the September evidence for 31%, 4,214 articles or 3,105 missing/default lead times. The original September source for 48% is also gone.

Surviving independent evidence permits a narrower answer:

- Priya's 24 September workshop turn still discusses approximately 1,300 fixes: utterance 41, 05:58. This provides an approximate contemporary figure.
- Priya's 28 October email independently reports 780 of 1,317 completed; her 19 December email reports all 1,317 completed. Those later messages preserve the exact remediation denominator and their own dated progress reports.
- Ana's 20 December email independently states shelf-life population remained at 48%, untouched during that phase. This supports a later report of the same figure; it cannot restore the deleted September citation.
- Lena's 24 September reduction to 25 stores across three regions survives: utterance 75, 09:00.

Ana, Priya and Lena remain named. The system invalidates derived claims and generated artifacts for rebuilding; it strips identifying references from surviving runtime passages and metadata. Unique roles established by signed messages and nearby pronoun continuations are also withdrawn conservatively. Suppression hashes and a workspace epoch prevent ordinary reimport and stale jobs from restoring erased content. Reset opens a separate workspace. Original supplied fixtures remain outside application source routes and model tools.

References: the surviving records above are in [Master-data remediation](../../materials/corpus/acme/emails/13_master-data-remediation.txt), messages 5, 3 and 2, and [Master-data workshop](../../materials/corpus/acme/transcripts/06_2024-09-24_master-data-workshop.txt), utterances 41 and 75. Executable checks: `npx tsx --test tests/memory.test.ts`.

## P8. An uncompleted commitment

The promised list of locations containing Sofia's personal information remains outstanding at its last recorded follow-up.

Sofia requested removal and a list of other locations on 18 November 2025. Marco promised the list on 19 November and asked for a few days. Ana reported the handover pack changed to v4 on 21 November, but said the older version remained in document history and had been escalated to IT. Sofia chased on 12 March 2026: she had still received no list, and the history issue remained open at their last discussion.

Katarina made closure and a complete location list item 3 of the 9 April review actions, due within four weeks. Marco's 29 April response answered items 1, 2 and 4 and explicitly left item 3 outstanding. Katarina confirmed that on 30 April and chased “Item 3” again on 23 June. A 2 July internal resourcing conversation claims the four actions are closed except retention. That conflicts with the dated customer action trail and supplies no closure evidence for item 3. The speaker remains labelled Me/Them. The archive contains no later customer confirmation or delivered location list.

Marco needed to notice his unfulfilled promise; Ana and IT owned the document-history follow-up, and Katarina was the customer reviewer tracking closure. An automated alert should identify it as outstanding at the 23 June follow-up, with uncertainty about events after the archive ends.

Sources: [March notes correction](../../materials/corpus/acme/emails/04_march-2024-notes-correction.txt), messages 4, 3, 2 and 1; [DPA review actions](../../materials/corpus/acme/emails/08_dpa-review-actions.txt), messages 4, 3, 2 and 1; [July internal resourcing](../../materials/corpus/acme/transcripts/23_2026-07-02_INTERNAL-renewal-resourcing.txt), turn 3.

## P9. Nightly-extract success reports

The weekly reports establish that Ana reported “Nightly article extract completed, no errors” on 12 January, 9 February and 9 March 2026. They are dated status assertions. Establishing actual successful execution and correct, complete data requires run logs and source-content checks, which the archive does not provide for those runs.

At the 16 June 2026 business review, Nadia explicitly explains the status line: the job ran and the file landed every night, while the contents had never been checked. She had compared January–March extract totals with till numbers and found that the extract was lower. She declines to state a numerical discrepancy because she has had the finding for only two days and does not yet trust the figure. Its cause remains unknown. The reported 3.4% waste figure was derived from those extract totals, so that figure needs review too. These observations are recorded at utterances 130–146, 10:41–12:06.

The 9 February report itself also records two January DC-2 failures. That makes an unrestricted claim of error-free operation inappropriate, while leaving open whether the repeated article-extract line refers to a narrower process or reporting interval.

Earlier incidents explain why a success status needs qualification. Priya's 17 March 2025 technical note says a job reported success after moving three files, including an empty upstream export. A file-size check was later added. The 18 March meeting records Tomas withdrawing the broader claim that expected file size catches this class of failure, because expected-size files can still contain the wrong content. The sources contain different incident descriptions; the answer should retain the source and date of each account.

The supported answer is that the reports recorded successful nightly extraction. The archive cannot establish that every relevant run actually succeeded or that its contents were correct.

Sources: [Q2 business review](../../materials/corpus/acme/transcripts/22_2026-06-16_q2-business-review.txt), utterances 130–146, 10:41–12:06; [Weekly status reports](../../materials/corpus/acme/reports/01_weekly-status-thread.txt), messages 4, 3 and 2; [DC-2 incidents](../../materials/corpus/acme/emails/16_dc2-hypercare-incidents.txt), messages 3, 2 and 1, dated 17 and 21 March 2025; [Hypercare review](../../materials/corpus/acme/transcripts/11_2025-03-18_hypercare-review.txt), utterances 112–125, 09:20–10:31.
