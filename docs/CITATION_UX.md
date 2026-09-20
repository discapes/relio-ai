# Reading cited answers

Inline citation chips open the evidence used for a statement. Consecutive markers are combined into a compact label, such as `4–10`. Activating the chip opens every referenced document, highlights the cited excerpts and moves keyboard focus to the first one. Each excerpt retains its original citation number and a link to its source record.

The evidence summary counts documents and excerpts separately. A response with 41 cited speaking turns from one meeting shows **1 document · 41 excerpts**. Document groups start collapsed. Within a meeting, consecutive recorded turns appear together with their timestamp range; gaps in the recorded turn sequence create separate passages. Every excerpt preserves its exact quote, author and source position. Documents with the same displayed title stay separate when their source IDs differ.

This presentation is shared by questions, briefings, conversation guidance, simulated agent replies and customer-card previews. Recorded names in the text and evidence link to the permitted People profiles. Text and PNG exports retain the original numbered markers and complete receipt list for reading outside the application.

The change affects presentation. It preserves evidence selection and verification, including their documented limits. Unknown or malformed reference markers remain visible as text and are never redirected to another excerpt. Source routes continue enforcing the current session's access and erasure rules.

## Validation

`tests/citations.test.ts` checks marker grouping, malformed and unavailable references, original numbering, document identity, preserved quotes and gaps between transcript passages. `tests/browser/citations.spec.ts` uses a simulated enhanced-form response with 41 excerpts to check collapsed groups, keyboard activation, exact source targets, multi-document expansion, literal HTML rendering, mobile layout and accessibility. The test performs no model inference.

The isolated review server uses port 43691 with `DATA_DIR=/tmp/receipt-ux-validation` and `DISABLE_BACKGROUND=1`. Its data is separate from the deployed workspace.
