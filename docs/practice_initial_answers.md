# Live practice answers

Generated through the deployed application workflow against an isolated runtime workspace on 2026-09-19T23:29:12.694Z. Model: GLM 5.3 Flash on Verda (formerly DataCrunch) in Helsinki. The independent source-checked reference is in practice_reference.md.

## P1

What did the master-data assessment report as complete in September 2024? Give every figure and the document each comes from. Distinguish assessment findings from remediation completion.

In September 2024, the master-data assessment reported the following figures for the pilot cohort. The assessment evidence comes from the 24 September 2024 master-data workshop transcript and the 30 September 2024 remediation scope email; both are assessment/scope records, not completion records.

Workshop figures (24 September 2024, Kwame Boateng) [1]:
- Case pack quantity missing on 31% of active articles ("Case pack quantity is missing on thirty-one percent of active articles.") [1]
- Shelf life populated on 48% of articles ("And shelf life is populated on forty-eight percent.") [1]
- Cohort size about 4,200 articles ("For the cohort, about four thousand two hundred,") [1]
- Store master clean, product hierarchy clean, supplier lead times populated but distrusted ("Store master is clean. Product hierarchy is clean. Supplier lead times are populated but I do not believe them,") [1]

The same figures were confirmed in the remediation scope email of 30 September 2024 (Kwame Boateng): "Articles in cohort 4,214 / Missing case pack quantity 1,317 / Missing or default supplier lead 3,105 / Shelf life populated 48%" [2].

Distinguishing assessment findings from remediation completion: the September 2024 assessment only measured the gaps; it did not report any remediation as complete. Remediation completion came later: on 19 December 2024 Priya Nair reported "Done. All 1,317." for case pack [3], and on 28 October 2024 she reported "Progress after four weeks: 780 of 1,317 done." [4]. Shelf life remained at 48% and untouched at that point (Ana Duarte, 20 December 2024: "shelf life remains at 48% and untouched.") [5].

Sources:

1. Master data workshop; 2024-09-24; Kwame Boateng; 3:31 · utterance 14. Record: `transcripts/06_2024-09-24_master-data-workshop#utterance-0014`. Quote: "quantity is missing on thirty-one percent of active articles."
2. Master data workshop; 2024-09-24; Kwame Boateng; 4:39 · utterance 25. Record: `transcripts/06_2024-09-24_master-data-workshop#utterance-0025`. Quote: "And shelf life is populated on forty-eight percent."
3. Master data workshop; 2024-09-24; Kwame Boateng; 5:44 · utterance 37. Record: `transcripts/06_2024-09-24_master-data-workshop#utterance-0037`. Quote: "For the cohort, about four thousand two hundred,"
4. Master data workshop; 2024-09-24; Kwame Boateng; 3:50 · utterance 17. Record: `transcripts/06_2024-09-24_master-data-workshop#utterance-0017`. Quote: "You did. Store master is clean. Product hierarchy is"
5. Master data workshop; 2024-09-24; Kwame Boateng; 4:01 · utterance 19. Record: `transcripts/06_2024-09-24_master-data-workshop#utterance-0019`. Quote: "clean. Supplier lead times are populated but I do not believe them,"
6. Master data remediation - progress; 2024-09-30T10:05:00; Kwame Boateng; Message 6. Record: `emails/13_master-data-remediation#message-006`. Quote: "Priya,\n\nAs agreed in the workshop, the remediation scope for the pilot cohort:\n\n  Articles in cohort                 4,214\n  Missing case pack quantity         1,317\n  Missing or default supplier lead   3,105\n  Shelf life populated               48%\n\nCase pack is the blocker. Lead times we can work around by deriving actuals from receipt\nhistory. Shelf life is out of scope for this phase.\n\nFile attached with the 1,317.\n\nKwame Boateng\nTechnical Consultant Image\n+44 7700 900 318\nk.boateng@relexsolutions.example\nImage\nrelexsolutions.example"
7. Re: Master data remediation - progress; 2024-12-19T18:15:00; Priya Nair; Message 3. Record: `emails/13_master-data-remediation#message-003`. Quote: "This email originated from outside of RELEX. Be careful of attachments and links from unknown senders. Report suspicious emails using the report button.\n\nDone. All 1,317. The two unresponsive suppliers we resolved by measuring actual delivered\nquantities over six months and inferring the case pack, which is not ideal but it is\nright for 190 of the 200.\n\nI would like it recorded somewhere that this took my team three weeks of overtime in\nDecember.\n\nPriya Nair\nIT Integration Lead\n+49 151 3307 9126\nAcme Org GmbH | Hansaring 82, 50670 Köln\nacme-org.example\nImage"
8. Re: Master data remediation - progress; 2024-10-28T16:50:00; Priya Nair; Message 5. Record: `emails/13_master-data-remediation#message-005`. Quote: "This email originated from outside of RELEX. Be careful of attachments and links from unknown senders. Report suspicious emails using the report button.\n\nProgress after four weeks: 780 of 1,317 done.\n\nSlower than I hoped. Two of the suppliers have not answered at all and between them they\naccount for about 200 articles.\n\nPriya Nair\nIT Integration Lead\n+49 151 3307 9126\nAcme Org GmbH | Hansaring 82, 50670 Köln\nacme-org.example\nImage"
9. Re: Master data remediation - progress; 2024-12-20T08:40:00; Ana Duarte; Message 2. Record: `emails/13_master-data-remediation#message-002`. Quote: "Recorded, and thank you. I have put it in the steering report.\n\nOne thing for the record so it is not a surprise in six months: shelf life remains at 48%\nand untouched. That is correct for this phase and it will become the critical path for\nphase two.\n\nBest regards,\nAna Duarte\nProject Manager Image\n+351 913 882 145 | UTC +01:00\nana.duarte@relexsolutions.example\nRua do Ouro 42, 1100-063 Lisboa\nConnect with me\nImage\nImage\nPlan better. Sell more. Waste less\nrelexsolutions.example Image\nLinkedInYouTube"

## P2

What service levels were agreed for ordering, and in which meeting? Explain any missing detail in the recorded agreement.

The recorded agreement on service levels for ordering is in the Ordering logic design workshop of 12 November 2024. Tomas Lindholm stated the numbers "ninety-eight and ninety-five" [1], and Lena Fischer responded "Fine. Agreed." [2]. The review cycle was also set in the same meeting: "Daily order, sort of daily delivery on the fast lines, twice weekly below" (Priya Nair) [3].

Missing detail: the transcript does not state which service level applies to which line category. Lindholm's utterance gives only the two figures (98 and 95) without explicitly tying 98 to fast lines and 95 to the rest; that split is implied by the parallel review-cycle wording (fast lines versus below) but is not spelled out for the service levels themselves. The transcript also does not record any written follow-up or formal decision document; the agreement exists only in the transcript. The draft's claims about a pilot cohort of 25 stores, ambient/dry goods scope, and fresh being Phase 2 are not supported by the supplied passages and have been removed.

Recommendation: Treat the 12 November 2024 workshop transcript as the source of record for the 98/95 service levels and the daily/twice-weekly review cycle, and note that the transcript does not explicitly map each percentage to a line category.

Sources:

1. Ordering logic design workshop; 2024-11-12; Tomas Lindholm; 6:49 · utterance 77. Record: `transcripts/07_2024-11-12_ordering-logic-design#utterance-0077`. Quote: "Then ninety-eight and ninety-five is a"
2. Ordering logic design workshop; 2024-11-12; Lena Fischer; 7:25 · utterance 83. Record: `transcripts/07_2024-11-12_ordering-logic-design#utterance-0083`. Quote: "Fine. Agreed."
3. Ordering logic design workshop; 2024-11-12; Priya Nair; 7:42 · utterance 86. Record: `transcripts/07_2024-11-12_ordering-logic-design#utterance-0086`. Quote: "Daily order, sort of daily delivery on the fast lines, twice weekly below."
