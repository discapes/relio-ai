import { affiliation } from '$lib/people';
import { fail } from '@sveltejs/kit';
import { sessionContext } from '$lib/server/session';
import * as workflows from '$lib/server/workflows';
import * as memory from '$lib/server/memory';
import type { Actions, PageServerLoad } from './$types';
import type { Context, Level } from '$lib/types';
export const load: PageServerLoad = ({ cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const ctx = sessionContext(cookies);
	if (ctx.persona.projects.includes(ctx.projectId)) workflows.prepareWorkspace(ctx);
	return workflows.workspaceData(ctx);
};
const value = (data: FormData, key: string) => String(data.get(key) || '').trim();
const list = (data: FormData, key: string) =>
	value(data, key)
		.split(/[,;\n]/)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
function action(fn: (ctx: Context, data: FormData) => unknown | Promise<unknown>) {
	return async ({
		request,
		cookies
	}: {
		request: Request;
		cookies: import('@sveltejs/kit').Cookies;
	}) => {
		try {
			const ctx = sessionContext(cookies);
			if (!ctx.persona.projects.includes(ctx.projectId))
				throw new Error('This identity has no access to Acme.');
			return { success: true, ...((await fn(ctx, await request.formData())) as object) };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'The request failed. Please retry.'
			});
		}
	};
}
export const actions: Actions = {
	ask: action(async (ctx, d) => ({
		answer: await workflows.answerQuestion(ctx, value(d, 'question'))
	})),
	refreshBrief: action(async (ctx, d) =>
		value(d, 'meetingId')
			? { answer: await workflows.generateBrief(ctx, value(d, 'meetingId')) }
			: { jobId: workflows.queueJob(ctx, 'brief') }
	),
	preference: action((ctx, d) => ({
		preference: workflows.savePreference(ctx, value(d, 'text'), value(d, 'id') || undefined)
	})),
	forgetPreference: action((ctx, d) => {
		workflows.forgetPreference(ctx, value(d, 'id'));
		return {};
	}),
	promote: action((ctx, d) => {
		workflows.promote(ctx, value(d, 'text'), Number(value(d, 'level') || ctx.level) as Level);
		return {};
	}),
	sendMail: action((ctx, d) => ({
		mail: workflows.sendMail(ctx, {
			id: value(d, 'eventId') || undefined,
			threadId: value(d, 'threadId') || undefined,
			subject: value(d, 'subject'),
			to: list(d, 'to'),
			cc: list(d, 'cc'),
			body: value(d, 'body')
		})
	})),
	retryMail: action((ctx, d) => ({ jobId: workflows.retryMail(ctx, value(d, 'id')) })),
	retryJob: action((ctx, d) => ({
		jobId: workflows.queueJob(ctx, value(d, 'kind') === 'extract' ? 'extract' : 'brief')
	})),
	guidance: action(async (ctx, d) => {
		const person = memory.people(ctx).find((p) => p.id === value(d, 'personId'));
		if (!person) throw new Error('Person unavailable.');
		return {
			answer: await workflows.answerQuestion(
				ctx,
				`Prepare ${affiliation(person).kind === 'relex' ? 'a collaboration brief for a RELEX colleague, focused on responsibilities, decisions and open handoffs' : affiliation(person).kind === 'customer' ? 'customer conversation guidance, focused on expressed priorities and responses to proposals' : 'conversation context, focused on recorded contributions and open questions'} for ${person.name}. Describe their role, expressed priorities, proposals and responses observed in the archive. Separate observed facts from recommendations about the next conversation. Do not infer personality or unsupported psychological traits.`,
				'guidance'
			)
		};
	}),
	share: action(async (ctx, d) => ({
		answer: await workflows.answerQuestion(
			memory.context(ctx.workspaceId, ctx.persona.id, 1),
			value(d, 'question'),
			'share'
		)
	})),
	erase: action((ctx, d) => ({ receipt: workflows.erase(ctx, value(d, 'personId')) })),
	reset: async ({ cookies }) => {
		const next = workflows.reset(sessionContext(cookies));
		cookies.set('relex_workspace', next, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.ORIGIN?.startsWith('https://') === true,
			maxAge: 60 * 60 * 24 * 30
		});
		return { success: true };
	}
};
