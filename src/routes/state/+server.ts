import { json } from '@sveltejs/kit';
import { sessionContext } from '$lib/server/session';
export function GET({ cookies }) {
	const ctx = sessionContext(cookies);
	return json(
		{ workspaceId: ctx.workspaceId, epoch: ctx.epoch, personaId: ctx.persona.id, level: ctx.level },
		{ headers: { 'cache-control': 'no-store' } }
	);
}
