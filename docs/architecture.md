# Application contracts

The application uses SQLite and a cookie-selected isolated workspace. Demo identities are server-defined. Project membership and clearance govern every source query. A Context contains workspaceId, persona, projectId, level and erasure epoch. Public types are in src/lib/types.ts.

Source IDs preserve the parsed corpus IDs. Runtime messages have random IDs. Source text and exact citations remain separately inspectable. Claims link to source IDs. Artifacts carry workspace, owner, level, source dependencies and epoch. Publication verifies the current epoch. Erasure invalidates derivatives and cleans runtime sources, mailbox content and personal state; persisted suppression prevents reimport.

The model client uses the Helsinki endpoint with bounded concurrency. Structured JSON is validated and citations bind to permitted exact source passages. The model sees only sources returned for the effective Context. Customer export and email participation use fresh scoped requests with no private history.

The UI uses server loads and form actions. POST actions: ask(question), refreshBrief, preference(text,id?), forgetPreference(id), promote(text,level), sendMail(threadId?,subject,to,cc,body,eventId), retryMail(id), guidance(personId), share(question), erase(personId), reset. Persona changes use /session; source views use /source/[id] and are checked against the current Context. All UI actions return {error? ,answer? ,success?}; successful mutations invalidate the page data.

Memory storage exports context, scoped source/claim/person reads, source ingestion, erasure, epoch checks and isolated reset. Workflow functions compose these operations with personal preferences, durable jobs, inference and publication guards. The implementation lead owns integration; specialist work has been handed back after testing.

Submission documents use an allowlist. Their source-bearing baseline views and downloads require Acme membership, L3 and epoch zero. They use no-store responses and current-context polling. Original source fixtures are not exposed as file routes.

Production runs an immutable build selected by an atomic release symlink. SQLite state and reviewed documents remain in the project directory, outside release bundles.
