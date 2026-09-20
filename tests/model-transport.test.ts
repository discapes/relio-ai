import test from 'node:test';
import assert from 'node:assert/strict';
import { modelJSON, cancelModelCalls } from '../src/lib/server/model';
const closedSocket = () =>
	new TypeError('fetch failed', {
		cause: Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' })
	});
test('closed idle provider socket retries once before a response, on a fresh connection', async () => {
	const original = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async (_url, init) => {
		calls++;
		if (calls === 1) throw closedSocket();
		assert.equal((init?.headers as Record<string, string>).connection, 'close');
		return new Response(
			JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] })
		);
	};
	try {
		assert.deepEqual(
			await modelJSON('Task', 'Input', undefined, 'transport-retry', false, 1, ['ok']),
			{ ok: true }
		);
		assert.equal(calls, 2);
	} finally {
		globalThis.fetch = original;
	}
});
test('cancellation before a socket error prevents retry', async () => {
	const original = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		cancelModelCalls('transport-cancel');
		throw closedSocket();
	};
	try {
		await assert.rejects(modelJSON('Task', 'Input', undefined, 'transport-cancel'));
		assert.equal(calls, 1);
	} finally {
		globalThis.fetch = original;
	}
});
test('a second socket failure terminates the request without unbounded retry', async () => {
	const original = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		throw closedSocket();
	};
	try {
		await assert.rejects(modelJSON('Task', 'Input', undefined, 'transport-twice'), /fetch failed/);
		assert.equal(calls, 2);
	} finally {
		globalThis.fetch = original;
	}
});
