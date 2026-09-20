import { sessionContext } from '$lib/server/session';
import { submissionDocument, submissionDocuments } from '$lib/server/submission';
export function load({ cookies, params, setHeaders }) {
	const ctx = sessionContext(cookies);
	setHeaders({ 'cache-control': 'private, no-store' });
	return {
		document: submissionDocument(ctx, params.slug),
		documents: submissionDocuments,
		context: {
			workspaceId: ctx.workspaceId,
			epoch: ctx.epoch,
			personaId: ctx.persona.id,
			level: ctx.level
		}
	};
}
