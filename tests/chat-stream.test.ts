import test from 'node:test';
import assert from 'node:assert/strict';
import { partialTextField, streamLines } from '../src/lib/chat-stream';
import {
	withChatActivity,
	chatActivity,
	withoutChatActivity,
	cancelChatStreams,
	chatRevision,
	registerChat
} from '../src/lib/server/chat-activity';
import { modelJSON } from '../src/lib/server/model';

function bytes(chunks: string[]) {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
			controller.close();
		}
	});
}
test('JSON draft decoding handles every split across escapes, unicode, quotes and nested text fields', () => {
	const text = 'He said "yes".\nMä olen täällä 😀 / \\ 끝';
	const encoded = JSON.stringify({ nested: { text: 'DO NOT SHOW' }, text, citations: [] });
	for (let i = 0; i <= encoded.length; i++) {
		const shown = partialTextField(encoded.slice(0, i));
		assert.ok(text.startsWith(shown), `${i}: ${shown}`);
		assert.ok(!/[\uD800-\uDBFF]$/.test(shown));
	}
	assert.equal(partialTextField(encoded), text);
	assert.equal(partialTextField('{"text":"A\\u00e4\\ud83d\\ude00"}'), 'Aä😀');
	assert.equal(partialTextField('{"text":"A\\u00'), 'A');
	assert.equal(partialTextField('{"text":"A\\ud83d'), 'A');
});
test('line streaming preserves split UTF-8 and final unterminated line', async () => {
	const data = new TextEncoder().encode('one\r\nMä😀\nlast');
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const byte of data) controller.enqueue(Uint8Array.of(byte));
			controller.close();
		}
	});
	const lines: string[] = [];
	for await (const line of streamLines(body)) lines.push(line);
	assert.deepEqual(lines, ['one', 'Mä😀', 'last']);
});
test('real provider deltas emit provisional text before the completion response resolves', async () => {
	const original = globalThis.fetch;
	const events: string[] = [];
	globalThis.fetch = async (_url, options) => {
		assert.equal(JSON.parse(String(options?.body)).stream, true);
		return new Response(
			bytes([
				'data: {"choices":[{"delta":{"reasoning_content":"PRIVATE REASONING"}}]}\n\n',
				'data: {"choices":[{"delta":{"content":"{\\"text\\":\\"Hello"}}]}\n\n',
				'data: {"choices":[{"delta":{"content":" Helsinki\\",\\"citations\\":[]}"}}]}\n\n',
				'data: [DONE]\n\n'
			])
		);
	};
	try {
		const answer = await withChatActivity(
			{
				signal: new AbortController().signal,
				emit: (event) => {
					if (event.type === 'draft') events.push(event.text);
				}
			},
			() =>
				modelJSON<{ text: string }>(
					'Task',
					'Evidence',
					undefined,
					undefined,
					false,
					1,
					['text'],
					undefined,
					true
				)
		);
		assert.deepEqual(events, ['', 'Hello', 'Hello Helsinki']);
		assert.equal(answer.text, 'Hello Helsinki');
	} finally {
		globalThis.fetch = original;
	}
});
test('cancelled inference cannot return a final result and detached work has no chat observer', async () => {
	const original = globalThis.fetch;
	const controller = new AbortController();
	globalThis.fetch = async () => {
		controller.abort();
		return Response.json({ choices: [{ message: { content: '{"text":"stale"}' } }] });
	};
	try {
		await assert.rejects(
			withChatActivity({ signal: controller.signal, emit: () => {} }, () =>
				modelJSON('Task', 'Evidence')
			),
			{ name: 'AbortError' }
		);
	} finally {
		globalThis.fetch = original;
	}
	await withChatActivity(
		{
			signal: new AbortController().signal,
			emit: () => {
				throw new Error('private observer');
			}
		},
		async () => {
			assert.ok(chatActivity());
			await withoutChatActivity(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
				assert.equal(chatActivity(), undefined);
			});
		}
	);
});
test('session invalidation advances revision and cancels all registered streams', () => {
	const first = new AbortController(),
		second = new AbortController();
	const remove = registerChat('revision-test', first),
		remove2 = registerChat('revision-test', second);
	const initial = chatRevision('revision-test');
	cancelChatStreams('revision-test');
	assert.equal(chatRevision('revision-test'), initial + 1);
	assert.ok(first.signal.aborted && second.signal.aborted);
	remove();
	remove2();
});
