import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'relio-stream-tests-'));
process.env.DISABLE_BACKGROUND = '1';
import * as memory from '../src/lib/server/memory';
import * as workflows from '../src/lib/server/workflows';
import { chatResponse } from '../src/lib/server/chat-response';
import { withChatActivity } from '../src/lib/server/chat-activity';
import { streamLines, type ChatEvent } from '../src/lib/chat-stream';
import type { Source } from '../src/lib/types';

const original = globalThis.fetch;
const source: Source = {
	id: 'stream-public',
	documentId: 'stream-public',
	title: 'Pilot approval',
	date: '2026-07-06',
	author: 'Ana Duarte',
	text: 'The approved pilot covers 25 stores.',
	level: 1,
	position: 'Message 1',
	participants: [],
	type: 'email'
};
const json = (value: unknown) =>
	Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
const completion = {
	text: 'The pilot covers 25 stores.',
	citations: [{ sourceId: source.id, quote: source.text }],
	statements: [{ text: 'The approved pilot covers 25 stores.', sourceIds: [source.id] }]
};
function streamedDraft() {
	return new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				const encode = (value: string) => new TextEncoder().encode(value);
				for (const content of [
					'{"text":"The pilot',
					' covers 25 stores.","citations":[{"sourceId":"stream-public","quote":"The approved pilot covers 25 stores."}]}'
				])
					controller.enqueue(
						encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
					);
				controller.enqueue(encode('data: [DONE]\n\n'));
				controller.close();
			}
		})
	);
}

test('endpoint streams a provisional draft before verification and persists only the checked final', async () => {
	const ctx = memory.context('stream-response', 'ana', 1);
	memory.addSource(ctx, source);
	let release!: () => void;
	const verified = new Promise<void>((resolve) => (release = resolve));
	globalThis.fetch = async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		if (body.messages[0].content.startsWith('Classify'))
			return json({ action: 'question', research: 'standard' });
		if (body.stream) return streamedDraft();
		await verified;
		return json(completion);
	};
	const events: ChatEvent[] = [];
	try {
		const response = chatResponse(ctx, 'What is approved?', new AbortController().signal);
		assert.match(response.headers.get('cache-control')!, /no-store/);
		for await (const line of streamLines(response.body!)) {
			const event = JSON.parse(line) as ChatEvent;
			events.push(event);
			if (event.type === 'draft' && event.text) {
				assert.equal(workflows.workspaceData(ctx).chat.length, 0);
				release();
			}
		}
		assert.equal(events[0].type, 'stage');
		const draft = events.findIndex((event) => event.type === 'draft' && !!event.text);
		const final = events.findIndex((event) => event.type === 'final');
		assert.ok(draft > 0 && final > draft);
		const answer = events[final];
		assert.ok(answer.type === 'final');
		assert.equal(answer.answer.citations[0].sourceId, source.id);
		assert.equal(workflows.workspaceData(ctx).chat.length, 1);
	} finally {
		release();
		globalThis.fetch = original;
	}
});

test('reset cancels an active stream before persistence even though old epoch stays unchanged', async () => {
	const ctx = memory.context('stream-reset', 'ana', 1);
	globalThis.fetch = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		return json({ action: 'question' });
	};
	const events: ChatEvent[] = [];
	try {
		const response = chatResponse(ctx, 'What changed?', new AbortController().signal);
		for await (const line of streamLines(response.body!)) {
			const event = JSON.parse(line) as ChatEvent;
			events.push(event);
			if (event.type === 'stage' && event.stage === 'starting') workflows.reset(ctx);
		}
		assert.equal(memory.epoch(ctx.workspaceId), ctx.epoch);
		assert.ok(events.some((event) => event.type === 'error'));
		assert.ok(!events.some((event) => event.type === 'final' || event.type === 'draft'));
		assert.equal(workflows.workspaceData(ctx).chat.length, 0);
	} finally {
		globalThis.fetch = original;
	}
});

test('detached other-owner background briefing cannot stream private content into a chat', async () => {
	const owner = memory.context('detached-owner', 'marco', 1);
	memory.addSource(owner, source);
	workflows.savePreference(owner, 'PRIVATE-OTHER-OWNER-999 follow inventory.');
	const events: ChatEvent[] = [];
	const requests: { stream: boolean; messages: { content: string }[] }[] = [];
	globalThis.fetch = async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		requests.push(body);
		return json(completion);
	};
	try {
		await withChatActivity(
			{ signal: new AbortController().signal, emit: (event) => events.push(event) },
			() => workflows.runJobs()
		);
		for (
			let i = 0;
			i < 100 && workflows.workspaceData(owner).jobs.some((job) => job.status === 'running');
			i++
		)
			await new Promise((resolve) => setTimeout(resolve, 5));
		assert.ok(
			requests.some((request) =>
				request.messages.some((message) => message.content.includes('PRIVATE-OTHER-OWNER-999'))
			)
		);
		assert.ok(requests.every((request) => !request.stream));
		assert.deepEqual(events, []);
	} finally {
		globalThis.fetch = original;
	}
});

test('session change while request JSON is pending prevents late stream registration', async () => {
	const { POST } = await import('../src/routes/chat/stream/+server');
	const { cancelChatStreams } = await import('../src/lib/server/chat-activity');
	const ctx = memory.context('70000000-0000-4000-8000-000000000001', 'ana', 1);
	let release!: (input: unknown) => void;
	const body = new Promise((resolve) => (release = resolve));
	const cookieValues: Record<string, string> = {
		relex_workspace: ctx.workspaceId,
		relex_persona: ctx.persona.id,
		relex_level: '1'
	};
	const cookies = {
		get: (name: string) => cookieValues[name],
		set: (name: string, value: string) => {
			cookieValues[name] = value;
		}
	};
	const { setWorkspaceCookie } = await import('../src/lib/server/session');
	setWorkspaceCookie(cookies as never, ctx.workspaceId);
	const pending = POST({
		request: { headers: new Headers({ origin: 'http://localhost' }), json: () => body },
		cookies,
		url: new URL('http://localhost/chat/stream')
	} as never);
	cancelChatStreams(ctx.workspaceId);
	release({
		question: 'What changed?',
		context: { workspaceId: ctx.workspaceId, personaId: ctx.persona.id, level: 1, epoch: ctx.epoch }
	});
	await assert.rejects(Promise.resolve(pending), (error: any) => error.status === 409);
});

test('provisional chunks cannot display erased names before final validation', async () => {
	let ctx = memory.context('erased-provisional', 'ana');
	memory.addSource(ctx, source);
	workflows.erase(ctx, 'kwame-boateng');
	ctx = memory.context(ctx.workspaceId, 'ana');
	globalThis.fetch = async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		if (body.messages[0].content.startsWith('Classify'))
			return json({ action: 'question', needsEvidence: true });
		if (body.stream) {
			const text = JSON.stringify({
				text: 'The completed answer says Kwame Boateng handled this pilot.',
				citations: [{ sourceId: source.id, quote: source.text }]
			});
			const chunks = [...text]
				.map((content) => 'data: ' + JSON.stringify({ choices: [{ delta: { content } }] }) + '\n\n')
				.join('');
			return new Response(chunks + 'data: [DONE]\n\n', {
				headers: { 'content-type': 'text/event-stream' }
			});
		}
		return json(completion);
	};
	try {
		const events: ChatEvent[] = [];
		const output = chatResponse(ctx, 'Who handled this pilot?', new AbortController().signal);
		for await (const line of streamLines(output.body!)) events.push(JSON.parse(line));
		assert.ok(!JSON.stringify(events).includes('Kwame'));
		assert.ok(events.some((event) => event.type === 'error'));
		assert.equal(workflows.workspaceData(ctx).chat.length, 0);
	} finally {
		globalThis.fetch = original;
	}
});
