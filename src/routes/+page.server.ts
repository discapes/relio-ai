import { reviewerGuide } from '$lib/server/reviewer';
import { fail } from '@sveltejs/kit';
import { sessionContext, setWorkspaceCookie } from '$lib/server/session';
import * as workflows from '$lib/server/workflows';
import * as memory from '$lib/server/memory';
import type { Actions, PageServerLoad } from './$types';
import type { Context, Level } from '$lib/types';
export const load: PageServerLoad = ({ cookies, setHeaders, url }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const ctx = sessionContext(cookies);
	if (ctx.persona.projects.includes(ctx.projectId)) workflows.prepareWorkspace(ctx);
	const sessionNotice = cookies.get('relex_session_notice')
		? 'Session security was updated. This browser now has a fresh isolated demo workspace; previous workspace data remains saved.'
		: undefined;
	if (sessionNotice) cookies.delete('relex_session_notice', { path: '/' });
	const guidancePeople = url.searchParams.get('view') === 'people' ? memory.people(ctx) : undefined;
	const guidanceSnapshot = guidancePeople
		? {
				fingerprint: workflows.guidanceFingerprint(ctx),
				personIds: new Set(guidancePeople.map((person) => person.id))
			}
		: undefined;
	if (guidancePeople)
		workflows.ensurePeopleGuidance(ctx, guidancePeople, guidanceSnapshot!.fingerprint);
	const personGuidance =
		url.searchParams.get('view') === 'people' && url.searchParams.get('person')
			? workflows.preparedGuidance(ctx, url.searchParams.get('person')!, guidanceSnapshot)
			: null;
	return {
		...workflows.workspaceData(ctx, guidancePeople),
		personGuidance,
		sessionNotice,
		reviewerGuide: reviewerGuide(ctx, url.searchParams.get('view') || '')
	};
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
		jobId: workflows.retryPreparation(ctx, value(d, 'id'))
	})),
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
		setWorkspaceCookie(cookies, next);
		return { success: true };
	}
};
