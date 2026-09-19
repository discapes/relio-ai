# Application contracts

The application uses SQLite and a cookie-selected isolated workspace. Demo identities are server-defined. Project membership and clearance govern every source query. A Context contains workspaceId, persona, projectId, level and erasure epoch. Public types are in src/lib/types.ts.

Source IDs preserve the parsed corpus IDs. Runtime messages have random IDs. Source text and exact citations remain separately inspectable. Claims link to source IDs. Artifacts carry workspace, owner, level, source dependencies and epoch. Publication verifies the current epoch. Erasure invalidates derivatives and cleans runtime sources, mailbox content and personal state; persisted suppression prevents reimport.

The model client uses the Helsinki endpoint with bounded concurrency. Structured JSON is validated and citations bind to permitted exact source passages. The model sees only sources returned for the effective Context. Customer export and email participation use fresh scoped requests with no private history.

The UI uses server loads and form actions. POST actions: ask(question), refreshBrief, preference(text,id?), forgetPreference(id), promote(text,level), sendMail(threadId?,subject,to,cc,body,eventId), retryMail(id), guidance(personId), share(question), erase(personId), reset. Persona changes use /session; source views use /source/[id] and are checked against the current Context. All UI actions return {error? ,answer? ,success?}; successful mutations invalidate the page data.

Workers: memory owns src/lib/server/memory.ts and its tests. UI owns Svelte components/routes .svelte files and app.css. Lead owns model.ts, workflows.ts, server routes/actions, types and integration. Memory exports context(workspaceId,personaId,level?), personas, sources(ctx), claims(ctx), people(ctx), getSource(ctx,id), addSource(ctx,source), erasePerson(ctx,id), epoch(workspaceId), ensureWorkspace(id), db(). Exact signatures may extend with tests and integration.
