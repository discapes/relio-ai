# How it works

Receipt combines a shared record of a customer project with an employee’s private working memory. The shared record supplies evidence for questions, briefings and email contributions. Private preferences help decide what deserves that employee’s attention. They are kept separate from the project email agent and customer sharing.

## From conversations to project memory

The starting Acme archive contains meeting transcripts, email threads and status reports. Import preserves each message or speaking turn as a source record with its author, date, document and position. The model extracts useful observations, decisions, commitments and open questions, retaining links to the records that support them. Project memory presents both these extracted claims and the underlying sources.

The email simulator demonstrates how new information can enter the same system. When an employee includes the project agent in To or Cc, the delivered message is stored as evidence. The agent sees that message, explicitly quoted history and permitted project memory. It decides whether a reply would make a useful contribution. Background processing also refreshes relevant briefings and can add a simulated calendar event when the message explicitly schedules one. The original imported archive predates this simulated participation.

## How an answer is prepared

A request first identifies the employee, project and permitted access level. For an ordinary project question, the model receives the accessible source context. For a broad chronology, inventory or commitment question, it first reviews groups of documents to locate relevant evidence. It then writes a draft from original records, with neighbouring turns available where a statement spans several speakers or fragments.

The interface streams that draft while clearly marking its source checks as pending. A further model pass checks statements against original passages, including numbers, dates, attribution and the difference between a proposal and an approval. The server binds the resulting citations to available source records and stores the checked answer. The progress messages describe these stages; they do not expose the model’s private reasoning.

Each citation retains an exact evidence excerpt and a link to its source. The display groups excerpts from the same document, with consecutive transcript turns shown as passages. Grouping changes how the evidence is read while preserving individual record references. Sources retain their recorded dates, and generated answers have a separate preparation time.

## Access and personal memory

Project membership determines which project can be read. Within it, L1 contains customer-shareable information; L2 also includes RELEX internal information; L3 also includes restricted information. The server applies these boundaries before constructing model input and when serving source pages. Historic classifications are based on message audiences and document metadata under the demonstration’s policy.

Personal preferences and saved conversations belong to the selected employee. Customer cards and external email use fresh requests with the appropriate shared evidence and exclude that private context. Switch view represents an identity-provider integration by selecting a simulated employee and clearance. Each browser begins with its own workspace.

## Changes, older information and deletion

Extracted claims retain dates and statuses, and questions about progress ask the model to compare later corrections and follow-ups. Briefings are refreshed through persistent jobs when relevant messages or preferences change, and through daily checks after 06:00 Helsinki time. A briefing’s recent preparation time must be read alongside the dates of its evidence.

Person erasure operates on runtime sources and their derivatives. It cleans identifying references, withdraws affected evidence and personal state, invalidates generated answers and claims, and cancels active work. A new workspace version prevents an earlier request from publishing after deletion. Hashed identifiers persist so that normal imports cannot restore erased material. Independent surviving evidence remains available. Original supplied files, other workspaces and previously downloaded copies have separate retention boundaries.

## Hosting and limits

The application and its SQLite working memory run on a Hetzner host in Helsinki. GLM 5.3 Flash runs separately on Verda, formerly DataCrunch, in Helsinki, reached through an SSH tunnel. Email delivery, sign-in and calendar integration are simulated; ingestion, model requests, memory updates and deletion run in the application.

Source checks reduce unsupported answers but still rely on model interpretation. Broad questions can miss figures, overlook an early agreement or omit later follow-ups. Missing attachments and unidentified speakers remain evidence gaps. The Practice answers page provides source-reviewed answers to the challenge questions; individual chat responses can differ. Use the linked passages to inspect conclusions that matter to a customer decision.
