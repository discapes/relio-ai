# First-use improvements

The blind Chromium review in artifacts/blind_judge_ux/ux_report_fi.md identified places where a reviewer had to search for the result of an action. This pass changes the interactions without adding onboarding panels.

- Sending an email opens and focuses the new message, with its processing status beside the sender.
- Expanded citation evidence has a Back to answer control returning keyboard focus to the selected citation. Source pages carry a return link to the answer, selected graph topic, source list or person profile. Routes carry location identifiers; both pages load data under current session permissions.
- Graph topics use the recorded statement as their label. The full selected statement appears above the diagram. Decision and observation cards have a View connections link.
- My workspace has an Ask your project shortcut that focuses the question field. The initial brief shows two complete paragraphs; Read complete briefing exposes the rest. Short headings and caveats stay in the paragraph sequence, and all evidence remains available.
- The access selector displays the current level. Background extraction reads Updating project memory. Source counts identify displayed passages. Returning after an interrupted search restarts the query.

The post-erasure temporal contradiction is a model-answer issue and remains outside this presentation change. Generated technical identifiers and long chronology paragraphs also remain answer-quality concerns. No generation settings, prepared-guidance keys or database contents are changed by this UX work.

Validation used a SQLite backup on isolated port 42586 with background inference disabled. Eleven existing/focused browser workflows passed initially; the new Ask shortcut focus assertion exposed a navigation race, which was fixed. Both new graph/access/shortcut and sent-message workflows then passed. The citation test checks return focus and exact evidence. Desktop and mobile graph and sent-message captures were inspected. Type checking and the 75-test deterministic suite passed before this release. The PDF viewer was checked separately by its implementation agent.
