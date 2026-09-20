import { recordUsageInput } from '$lib/server/usage';
import { error } from '@sveltejs/kit';
import { sessionContext } from '$lib/server/session';
import { chatRevision } from '$lib/server/chat-activity';
import { chatResponse } from '$lib/server/chat-response';

export async function POST({ request, cookies, url }) {
	if (request.headers.get('origin') !== url.origin)
		error(403, 'Request origin does not match this application.');
	const ctx = sessionContext(cookies);
	if (!ctx.persona.projects.includes(ctx.projectId))
		error(403, 'This identity has no access to Acme.');
	const revision = chatRevision(ctx.workspaceId);
	const input = await request.json().catch(() => error(400, 'Enter a valid question.'));
	if (typeof input?.question !== 'string' || !input.question.trim() || input.question.length > 8000)
		error(400, 'Enter a question of up to 8,000 characters.');
	if (
		input.meetingId !== undefined &&
		(typeof input.meetingId !== 'string' || !input.meetingId.trim() || input.meetingId.length > 200)
	)
		error(400, 'Choose an available meeting.');
	const current = {
		workspaceId: ctx.workspaceId,
		personaId: ctx.persona.id,
		epoch: ctx.epoch,
		level: ctx.level
	};
	if (
		!input.context ||
		Object.entries(current).some(([key, value]) => input.context[key] !== value)
	)
		error(409, 'Your session changed. Reload before asking again.');
	if (chatRevision(ctx.workspaceId) !== revision)
		error(409, 'Your session changed. Reload before asking again.');
	recordUsageInput(input);
	return chatResponse(ctx, input.question, request.signal, input.meetingId);
}
