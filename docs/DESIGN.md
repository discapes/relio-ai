# Design

Relio gives RELEX employees a shared customer-project memory and a personal morning brief. It starts with the supplied Acme archive and accepts new messages through an employee-side email simulator. Adding the project agent to a message’s recipients makes that delivered message available to project memory. The agent can contribute a cited reply when it judges that doing so helps the conversation.

## How provenance is stored

SQLite stores each email message, report update and transcript turn with its original record ID, document, author, date, position and access level. Extracted claims retain their supporting record IDs. Saved answers contain their text, exact evidence excerpts and source references, plus the employee, access level and workspace version that produced them. A separate model pass checks a draft against original passages; the server then binds citation numbers to available records. Clicking a citation opens the excerpt and its surrounding conversation.

## How stale facts are caught

Claims carry dated descriptions and statuses such as proposed, agreed, corrected and superseded. For chronology or commitment questions, the system first reviews document groups, then checks relevant original passages and neighbouring turns. Prompts require later corrections, scope changes and unresolved follow-ups to remain visible. New delivered mail and changed personal preferences queue fresh briefings; daily refresh after 06:00 Helsinki time is optional and disabled in the demo. Source dates and answer preparation times are shown separately. This process can still miss an earlier decision or a later follow-up: a recent preparation time does not establish that a fact is current.

## How deletion propagates

An authorised employee selects a person for erasure. The application removes or cleans identifying runtime evidence and recipient metadata, removes affected claims and answer passages while retaining surviving supported content, and removes affected mail, calendar and personal state. It cancels active inference and increments the workspace version so earlier work cannot publish. Hashed identifiers prevent ordinary reimport after restart. A receipt records deletion counts. Independently supported information can survive with other people still named. Alias and nearby-pronoun handling is heuristic and can withdraw extra context. Deletion covers the selected workspace; original fixtures, other workspaces, downloaded copies and infrastructure backups have separate retention boundaries.

## Where inference runs

GLM 5.3 Flash runs on Verda, formerly DataCrunch, in Helsinki. The application and SQLite database run separately on a Hetzner host in Helsinki; a local SSH tunnel connects the application to inference. Server-side project membership and three cumulative access levels filter evidence before model input. Customer sharing and external email exclude private employee memory. Provider logging and backup retention are outside the application’s deletion mechanism. Sign-in, email transport and calendar integrations are simulated in this demonstration.
