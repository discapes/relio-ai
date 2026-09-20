# Provenance and everyday use

Prepared content remains available while a user adds sources, changes personal preferences or deletes a participant. Opening a view does not launch inference. A brief or guide can be a prepared snapshot; its date and a short freshness note distinguish it from a new answer.

## Deletion and retained content

Source erasure keeps its existing alias and transcript-context behavior. Claims whose supporting records changed are withdrawn; claims with unchanged evidence survive. Stored answer and guidance paragraphs are checked against the remaining exact quotes and removed-identity suppression hashes. Unavailable or identifying paragraphs are removed, citation numbers are reassigned, and the remaining content advances to the new workspace version. Uncited paragraphs are withdrawn during erasure checks. Active jobs are cancelled, so a result from the old workspace version cannot publish.

People can read filtered baseline guidance after erasure. It is checked against the current workspace's sources and allowed access level each time; removed sources are never restored. The original baseline and other workspaces retain their own data. Prepared snapshots use the same requesting employee and access level, preserving private guidance boundaries.

These are pragmatic checks on displayed statements and their recorded support. The original model often read the whole archive. Exact surviving quotations do not prove that an uncited source had no influence on the original wording. Nearby pronoun and source erasure heuristics can also withdraw independent context. This implementation documents those limitations instead of discarding every result after any deletion.

Deletion follow-ups replace matching suppressed identity spans before storage or inference. A question asking what remains can be answered directly from the deletion receipt and surviving record counts. Other questions use the sanitized request and surviving evidence.

## Reviewer answers

Practice answers keep all nine question headings. Reviewed paragraphs, list items and table rows have explicit evidence dependencies in `PRACTICE_EVIDENCE.json`; unavailable passages are omitted and each affected answer gets one brief gap notice. Lower access levels retain customer-shareable answers and links. Erasure only removes affected passages. The reviewed source hashes also catch changed source text.

## Ask and meeting preparation

Ask state belongs to the application layout, so ordinary page changes retain generation, progress and the verified result. Switching workspace, employee, access level or erasure version cancels and clears the request. The meeting preparation shortcut submits the selected meeting through the same streaming transport; its verified answer is stored in conversation history with the meeting title.

Brief empty states distinguish actual queued/running preparation from an idle view. An idle view offers explicit preparation. A failed refresh does not pretend that work is still running.

## Verification

Isolated deterministic tests cover supported-paragraph retention, grouped citation normalization, baseline-backed guides after erasure, surviving claims, sanitized deletion follow-ups with zero inference, added-source freshness, and meeting streaming with inaccessible-meeting rejection. Browser checks cover ordinary navigation during generation, completion while away, return without duplicate requests, access-change cancellation and meeting progress. All tests use temporary data or SQLite backups; the live corpus and completed guidance were untouched during implementation.
