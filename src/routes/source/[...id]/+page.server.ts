import { sourceReturn } from '$lib/presentation/navigation';
import { error } from '@sveltejs/kit';
import { getSource, sources, people } from '$lib/server/memory';
import { sessionContext } from '$lib/server/session';
export function load({ cookies, params, setHeaders, url }) {
	setHeaders({ 'cache-control': 'private, no-store' });
	const ctx = sessionContext(cookies);
	const source = getSource(ctx, params.id);
	if (!source) error(404, 'This source is unavailable in your current project access.');
	const same = sources(ctx).filter((item) => item.documentId === source.documentId);
	const index = same.findIndex((item) => item.id === source.id);
	const neighbours = same
		.slice(Math.max(0, index - 3), index + 4)
		.filter((item) => item.id !== source.id);
	return {
		returnTo: sourceReturn(url.searchParams.get('returnTo')),
		source,
		people: people(ctx),
		neighbours,
		workspaceId: ctx.workspaceId,
		epoch: ctx.epoch,
		personaId: ctx.persona.id,
		level: ctx.level
	};
}
