import { redirect, error } from '@sveltejs/kit';
import { cancelChatStreams } from '$lib/server/chat-activity';
import { resolvePersona } from '$lib/server/memory';
export async function POST({ request, cookies }) {
	const data = await request.formData();
	const id = String(data.get('personaId') || 'ana');
	const persona = resolvePersona(id);
	if (!persona) error(400, 'Unknown identity');
	const level = Number(data.get('level') || persona.level);
	if (![1, 2, 3].includes(level) || level > persona.level) error(403, 'Access level unavailable');
	const settings = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.ORIGIN?.startsWith('https://') === true,
		maxAge: 60 * 60 * 24 * 30
	};
	const workspaceId = cookies.get('relex_workspace');
	if (workspaceId) cancelChatStreams(workspaceId);
	cookies.set('relex_persona', persona.id, settings);
	cookies.set('relex_level', String(level), settings);
	redirect(303, '/');
}
