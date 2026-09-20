# Observed visitor outcomes

Reviewed 20 September 2026 against the saved usage events, actual stored answers, surviving source records and application code at `1fbd895`. This is an internal review of two observed browser sessions. Firefox 155 on Linux belongs to the owner and is excluded. Browser IDs establish separate browser activity, not separate human identities. Public visitor IPs are unavailable.

The application completed the recorded work, retained the workspace changes and enforced the other-project restriction. The content results were mixed. Both Tomas answers contain supported useful facts, with a material omission. The Chrome 153 session exposed a wrong-question answer, a weak email reply, incorrect calendar provenance and an incorrect briefing attribution. Successful requests and valid quotation links did not establish that the resulting answers were correct.

## Evidence and method

| Session | Browser ID | Workspace ID |
| --- | --- | --- |
| Chrome 153 on Mac | `e50229c5-4a50-461a-b498-b11b6d461b27` | `e67f3d65-11dd-4dea-8e2a-72452e785c57` |
| Chrome 151 on Mac | `c5c2d7a3-a686-492c-8234-08f23d1b65fb` | `794362cc-13e1-42f0-8fba-928831fe6ddc` |

Times below are Helsinki time, UTC+3. Sources were read from `data/usage/events.ndjson` and SQLite opened with `mode=ro`. The audit inspected the four completed chat answers, one email reply, five stored briefs, two sent emails, the stored calendar event, deletion receipt and eight background jobs. All 132 citation occurrences in these ten artifacts referenced an existing source at an allowed level and quoted text present in that source. This mechanical check was followed by reading the claims and relevant contrary or omitted evidence.

No visitor session was replayed, no inference was run, and no application data or services were changed. The report describes the historical stored outputs. Logs do not contain a screen recording, the initial model drafts, intent-classifier output or every intermediate calendar state. A navigation event does not prove the visitor read the displayed text.

## Chrome 153: deletion and questions

### Deletion persisted; no explicit Ana identity resurfaced in the checked outputs

At 14:16:11 the visitor erased `ana-duarte`. Receipt `012af594-c934-4604-8ebf-cefce7862ae9` records 943 removed source records and 53 withdrawn stored results. The workspace advanced to epoch 1. Comparison with the untouched archive in the Chrome 151 workspace found 943 original records absent and 701 surviving originals changed, including participant and text edits. The two later simulated emails bring the source count from 2,031 to 2,033.

A targeted scan found no `Ana Duarte`, `Duarte` or `a.duarte` in this workspace's current source payloads, 225 claims, seven artifacts, three mail rows or one meeting row. The erased employee's simulator identity became `Project member 1`, and subsequent outgoing mail used `project-member-1@relexsolutions.example`. Both delivered messages and role changes survived the later return at 14:36:11.

This supports successful explicit-identity erasure in these stored results. It does not prove that every indirect description is unrecoverable or that every withdrawn neighbouring transcript fragment needed removal. Those are existing semantic limits described in `PROVENANCE_UX.md`. Shared baseline guidance remains in its own workspace and is filtered against surviving evidence at read time; zero local guidance rows does not establish that People guidance disappeared. Historical screenshots of that view are unavailable.

### The identity question avoided reconstruction but answered poorly

The exact submitted question at 14:16:24 was `who is Ana Duarte? `, including its trailing space. Artifact `4f4e5bac-cfb2-4b46-ad16-7c7aaed5f8cd`, completed at 14:16:40, stores the sanitized question `who is the removed person? `.

The answer starts:

> The supplied evidence does not identify any removed person, and the partitioned source inventory provided is empty, so the identity of a removed person cannot be reconstructed from the surviving records.

It then spends several paragraphs on Sofia Almeida's surgery-reference removal request and Priya Nair's mobile-number deletion request, with six citations. Those are real surviving records, but they do not answer who Ana was. Repeating Sofia's medical detail adds sensitive, irrelevant material to a simple deletion follow-up. The response did not identify Sofia as Ana; it explicitly declined to reconstruct the removed person.

**Assessment: erasure behavior passed this explicit-name probe; relevance and explanation need improvement.** An empty optional research inventory is not an empty evidence collection: the answer's own trace says it read 2,031 permitted records. The application should explain the applied deletion directly and avoid pulling in unrelated deletion cases. The current code sanitizes the name before the model request but does not provide a clear, dedicated response for this identity question.

### The project-manager question received the wrong workflow

At 14:16:55 the visitor asked exactly `what did the last project manager do?`. Artifact `8ac83956-7f18-4097-8bee-ce76cee828ff` completed at 14:17:08 with 25 citations. Its opening is:

> Latest dated meeting available in this view (all recorded audiences): 2026-07-02 — Acme renewal and resourcing.

The remainder summarizes that meeting, including commercial figures, Nadia's workload and pay position, union representation and anonymisation concerns. It does not identify a project manager or explain that the relevant person may have been erased. These details were L3-permitted, so this is not evidence of a cross-level leak.

**Assessment: confirmed high-priority relevance bug.** The code's `latestMeeting` classification causes the server to replace archive-wide evidence with the latest transcript and explicitly instruct the model to summarize it. The stored prefix and trace confirm that branch ran. The classifier's exact intermediate JSON is not retained, but the resulting branch is unambiguous. The original request concerns a person, not the last meeting. A follow-up after deletion should preserve that intent, answer only surviving facts or explain the gap, and ask which manager is meant if necessary.

That answer also repeats two contradicted claims from the July meeting without warning:

- “four actions are closed except the retention policy” repeats transcript 23, turn 3. `emails/08_dpa-review-actions#message-003` sets retention at 18 months from 1 May; messages 2 and 1 leave erasure item 3 open, with a June 23 chase.
- “he got his twelve months, roughly” repeats transcript 23, turn 9. `emails/20_chain-wide-proposal#message-004` explicitly says the twelve-month expectation was missed. Message 5 records Kahn's acknowledgement of the failure.

The reply is faithful to the selected transcript's words, but the challenge explicitly requires detecting records that were wrong when written. Restricting verification to that one transcript prevents the available contradictions from being checked. Even an actual request for a latest-meeting summary should distinguish what was said from the evidence about whether it was accurate.

## Chrome 153: email, calendar and refreshed briefings

### Delivery and background work completed

At 14:18:48 the visitor sent email `36049101-acc4-4e20-ac08-1fcaf3566bb7`, explicitly scheduling the bakery evidence review for Thursday 9 July at 10:00 Helsinki. The sender said they would prepare the extracts-versus-environment comparison; Priya should bring updated Acme requirements and Nadia the integration questions. The mail is stored as `Memory updated`, with a corresponding L1 runtime source.

At 14:19:06 they sent `555291aa-e7dc-4e3d-bc4c-4b373098a6a5` with body `whati s the update in environment access `. The persisted message trims the final space. It is stored as `Agent replied`, with an L1 source and reply. Both mail jobs, three briefing jobs and three extraction jobs are `done`, with no error. There is no pending work for these sessions in the inspected job rows.

Silent ingestion of the scheduling message fits the intended participation policy. Replying to the subsequent access question is also appropriate. The issue is the content of the reply and the calendar's evidence binding.

### The email reply omitted the actual access decision

Artifact `bd219b17-f12d-4e99-92ee-1eefdf1e7c28`, completed at 14:19:23, repeats the scheduled review and its preparation duties. It then says:

> The question about the environment access update was asked on 6 July 2026 by a project member; the scheduled review on 9 July is the recorded response in the supplied evidence. No further update on environment access appears in the supplied passages.

The scheduling message preceded the question, so calling it the recorded response is misleading. More importantly, the same surviving L1 email thread contains the answer: Priya chose prepared extracts on 2 March because the current environment cannot restrict read access by category; Ivan accepted that decision. Tomas estimated a separate environment at roughly two weeks of setup. These are `emails/19_meridian-environment-access#message-002`, `001`, `004` and `003` respectively. All remained present after Ana's deletion and were later used in briefings.

**Assessment: confirmed medium-priority answer-quality failure.** The reply's two citations are valid and appropriate for all recipients, but it misses the useful existing decision. Its trace says only two passages were supplied at verification. `verifyDraft` expands only the draft's cited records and nearby records when no separate research inventory exists. That can validate a narrow draft while overlooking the decisive historical evidence. The participation stage receives permitted project memory; this audit cannot establish whether the initial draft omitted the decision or whether verification lost it. The final answer is the observed failure.

### The calendar appeared with correct details but the wrong source

The stored event is `meeting-555291aa-e7dc-4e3d-bc4c-4b373098a6a5`, “Bakery evidence review,” dated `2026-07-09T10:00:00+03:00`. Its attendees are Priya Nair and Nadia Haddad, with the intended preparation purpose. These details match the first message.

Its sole `sourceIds` entry is `runtime/555291aa-e7dc-4e3d-bc4c-4b373098a6a5`: the second message containing only the access question. No event row points to the first scheduling message. The first regenerated brief's stored prompt contains `simulated meetings: []`; later prompts contain the event bound to the second message.

**Assessment: confirmed high-priority provenance bug and missed first-message extraction.** The calendar was eventually populated, but its supporting source does not schedule anything. `processMail` asks the model to extract a meeting only from the new message, supplies the archive as context, then binds any returned meeting to that new source without validating this distinction. Fix direction: validate the scheduling statement and bind its actual evidence; an access question should not create a new event from an earlier message.

### Nadia's regenerated briefing assigned the sender's work to Priya

At 14:21:09 the visitor switched to Nadia, L1, and expanded briefing evidence. The latest stored L1 briefing, `c5abef1b-e764-45d6-b0b2-532afe06b1bc`, had completed at 14:20:17 with 12 citations. Its first paragraph says:

> Priya Nair scheduled it and will prepare the comparison of prepared extracts versus a separate environment

Citation 1 is the scheduling email, whose author is `Project member 1`. The email says “I have scheduled” and “I will prepare”; Priya is the recipient asked to bring Acme requirements.

**Assessment: confirmed medium-priority attribution bug in the brief available to this visitor.** The source and quote exist, but they do not support the named actor. The other stored brief variants use the organiser or the actual sender instead, showing the error is specific to Nadia's generated text. Verification must check who “I” refers to and distinguish recipients' assigned duties. The remaining L1 briefing citations all point to L1 sources. No cross-level disclosure was found in the checked stored briefs or external email reply.

The updated briefs otherwise recovered useful current context: the extracts decision, setup estimate, open till-data commitment, DPO item 3, June reconciliation issue and warehouse dependency. The first L3 refresh had no calendar event yet but still read the scheduling email. A later L3 refresh incorporated the event. Several briefs do not obey the requested four-item presentation exactly; this is a lower-priority consistency issue.

## Chrome 151: Tomas questions and access switch

### Both Tomas answers were grounded, with a material omission

The visitor asked `What does Tomas think of the project?` at 14:17:19 and again at 14:17:52. Artifacts are `86a6d43d-0a7c-40d0-91c9-d2b3a3112a33` (14 citations) and `e8610eca-25a6-4e45-9e83-a68cec1e1d76` (21 citations).

Both correctly identify Tomas Lindholm and support their positive claims with his own words: ECC/nightly batches are workable; DC-2 is a named monitoring risk; master-data remediation and the shelf-life field matter; a file-size check was insufficient and he withdrew that recommendation; a separate environment costs about two weeks of setup; the Acme environment is EU West. The second answer adds the copied-document locations and a few original transcript details. It does not materially reverse the first answer. Both preserve the correction to the faulty file-check advice, which is a useful success on the challenge's currency criterion.

Both begin and end by saying there is no recorded overall project verdict. Avoiding an invented personal attitude is appropriate. However, both omit Tomas's most directly relevant assessment of project adoption: in `transcripts/11_2025-03-18_hypercare-review`, turns 91–109, he says planners returned to spreadsheets after a trust event, that it will not fix itself merely because the numbers improve, and that recovery requires time without another surprise. His March 2026 comment that everything is in Sofia's spreadsheet, followed by accepting her correction that this is a documented risk, is also relevant (transcript 20, turns 39–48).

**Assessment: mostly factually successful, moderately incomplete as an answer about his viewpoint.** The omission matters more than the variation from 14 to 21 citations. A useful summary could label an inference that his recorded stance focuses on technical realism, trust and operational dependencies, then substantiate it. The existing response reads more like a chronology of technical contributions. The logs do not tell us why the visitor repeated the question or whether they were dissatisfied.

### Other-project access was correctly denied; the interface invited an impossible action

At 14:19:12 the visitor applied `p4`, the other-project persona. They clicked the suggested UAT question and pressed Ask at 14:19:17. The server returned 403 before inference and input capture. No answer artifact was stored for that request. This correctly enforced the project boundary.

The exact final submitted body was not logged; the click label establishes the suggestion selected. `ChatStream.svelte` renders Acme suggestions without checking project membership, and the parent only passes the general busy state as `disabled`. Thus the visitor was offered a normal-looking action that could only fail for that identity.

**Assessment: access enforcement succeeded; confirmed low-priority UX defect.** The project-unavailable state should explain the current view and make returning to an Acme identity straightforward, with unavailable Ask controls disabled or absent. This does not require weakening the boundary.

## Priorities and limits

Address intent preservation and the calendar's source binding first. Then improve the email evidence selection, actor attribution and contradiction checks. A quotation existing in the database should remain one check among several: question relevance, actor, chronology and contrary evidence determine whether the answer is useful and correct.

There were no recorded unexpected HTTP errors for Chrome 153 and only the expected other-project 403 for Chrome 151. All four questions completed and were stored. This establishes working transport and persistence for these actions. It does not establish perfect streaming visuals, that every page rendered correctly on the visitor's device, or that they saw every refreshed result. The audit found no basis to claim who these visitors were or how they judged the product.
