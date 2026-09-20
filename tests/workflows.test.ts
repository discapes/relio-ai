import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const dir = mkdtempSync(resolve(tmpdir(), 'relex-workflow-'));
process.env.DATA_DIR = dir;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const wf = await import('../src/lib/server/workflows');
const { bindCitations } = await import('../src/lib/server/model');
// Background inference is disabled by keeping mutations within one synchronous test turn.
test('mail delivery is recipient-scoped, idempotent and separate from shared evidence', () => {
	const ctx = memory.context('delivery', 'ana');
	const first = wf.sendMail(ctx, {
		id: 'private-1',
		subject: 'Private simulator detail',
		to: ['lena.fischer@acme-org.example'],
		cc: [],
		body: 'Secret meeting at 14:37 under reference AMBER-712.'
	});
	assert.equal(first.status, 'Sent in simulator');
	assert.equal(
		memory.sources(ctx).some((s) => s.text.includes('AMBER-712')),
		false
	);
	const second = wf.sendMail(ctx, {
		id: 'private-1',
		subject: 'ignored duplicate',
		to: ['lena.fischer@acme-org.example'],
		cc: [],
		body: 'Duplicate'
	});
	assert.equal(second.body, first.body);
	const delivered = wf.sendMail(ctx, {
		id: 'delivered-1',
		threadId: first.threadId,
		subject: 'New message',
		to: ['lena.fischer@acme-org.example'],
		cc: [wf.AGENT_EMAIL],
		body: 'This new message contains BETA-915 only.'
	});
	assert.equal(delivered.level, 1);
	assert.equal(wf.workspaceData(ctx).mails.filter((m) => m.id === 'private-1').length, 1);
	assert.equal(
		wf.workspaceData(memory.context('delivery', 'marco')).mails.some((m) => m.id === 'private-1'),
		false
	);
	assert.equal(wf.workspaceData(ctx).jobs.length, 1);
});
test('personal memory is owner-isolated and erased identities cannot be saved', () => {
	const ctx = memory.context('private-memory', 'ana');
	wf.savePreference(ctx, 'Follow bakery access decisions.');
	assert.equal(wf.preferences(ctx).length, 1);
	assert.equal(wf.preferences(memory.context('private-memory', 'marco')).length, 0);
	const kwame = memory.people(ctx).find((p) => p.name === 'Kwame Boateng');
	assert.ok(kwame);
	wf.savePreference(ctx, 'Discuss delivery with Kwame Boateng.');
	wf.erase(ctx, kwame.id);
	const refreshed = memory.context('private-memory', 'ana');
	assert.equal(wf.preferences(refreshed).length, 1);
	assert.throws(() => wf.savePreference(refreshed, 'Ask Kwame Boateng again'), /erased/);
	assert.throws(() => wf.savePreference(ctx, 'stale write'), /changed/);
});
test('citation binding rejects unknown sources and fabricated quotes', () => {
	const ctx = memory.context('citations', 'ana');
	const source = memory.sources(ctx)[0];
	assert.equal(
		bindCitations([{ sourceId: source.id, quote: source.text.slice(0, 40) }], [source]).length,
		1
	);
	assert.equal(
		bindCitations([{ sourceId: source.id, quote: 'fabricated passage' }], [source]).length,
		0
	);
	assert.equal(
		bindCitations([{ sourceId: 'hidden', quote: source.text.slice(0, 40) }], [source]).length,
		0
	);
});
test.after(() => rmSync(dir, { recursive: true, force: true }));

test('delivery replay checks owner, and preparation jobs remain access-level specific', () => {
	const ana = memory.context('replay-owner', 'ana');
	wf.sendMail(ana, {
		id: 'private-owner-event',
		subject: 'Private reminder',
		to: ['lena.fischer@acme-org.example'],
		cc: [],
		body: 'Private MAIL-OWNER-CANARY.'
	});
	assert.throws(
		() =>
			wf.sendMail(memory.context('replay-owner', 'marco'), {
				id: 'private-owner-event',
				subject: 'replay',
				to: ['lena.fischer@acme-org.example'],
				cc: [],
				body: 'replay'
			}),
		/another employee/
	);
	const high = wf.queueJob(ana, 'brief');
	const low = wf.queueJob(memory.context('replay-owner', 'ana', 1), 'brief');
	assert.notEqual(high, low);
});
test('deleting an employee removes unnamed personal preferences owned by that employee', () => {
	const ctx = memory.context('owner-erasure', 'ana');
	wf.savePreference(ctx, 'My private goal has no name in its text.');
	const person = memory.people(ctx).find((p) => p.name === 'Ana Duarte');
	assert.ok(person);
	wf.erase(ctx, person.id);
	assert.deepEqual(wf.preferences(memory.context('owner-erasure', 'ana')), []);
});
test('same-owner replay respects a lowered access view', () => {
	const ctx = memory.context('replay-level', 'ana');
	wf.sendMail(ctx, {
		id: 'internal-event',
		subject: 'Internal',
		to: ['marco.rossi@relexsolutions.example'],
		cc: [],
		body: 'INTERNAL-ONLY replay check.'
	});
	assert.throws(
		() =>
			wf.sendMail(memory.context('replay-level', 'ana', 1), {
				id: 'internal-event',
				subject: 'Replay',
				to: ['marco.rossi@relexsolutions.example'],
				cc: [],
				body: 'Replay'
			}),
		/current access level/
	);
});

test('promoted private notes become attributed shared sources at the chosen boundary', () => {
	const ctx = memory.context('promoted-note', 'ana');
	wf.promote(ctx, 'Prepare the bakery decision comparison.', 2);
	const internal = memory
		.sources(ctx)
		.find(
			(source) =>
				source.type === 'shared_note' && source.text === 'Prepare the bakery decision comparison.'
		);
	assert.ok(internal);
	assert.equal(internal.author, 'Ana Duarte');
	assert.equal(internal.level, 2);
	assert.equal(memory.getSource(memory.context(ctx.workspaceId, 'nadia'), internal.id), undefined);
	assert.ok(memory.getSource(memory.context(ctx.workspaceId, 'marco'), internal.id));
});

test('claim verification retains proposal status through stable candidate identity', async () => {
	const ctx = memory.context('claim-status', 'ana');
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (_url, options) => {
		const prompt = JSON.parse(String(options?.body)).messages.at(-1).content;
		const sourceId = prompt.match(/"sourceId":"([^"]+)"/)?.[1];
		assert.ok(sourceId);
		const claim = prompt.startsWith('Extract up to')
			? { kind: 'decision', text: 'A proposed action.', status: 'proposed', sourceIds: [sourceId] }
			: {
					claimId: 'C1',
					text: 'The action was proposed.',
					status: 'agreed',
					sourceIds: [sourceId]
				};
		return Response.json({
			choices: [{ message: { content: JSON.stringify({ claims: [claim] }) } }]
		});
	};
	try {
		await wf.extractMemory(ctx);
		const claims = memory.claims(ctx);
		assert.equal(claims.length, 3);
		assert.ok(claims.every((claim) => claim.status === 'proposed' && claim.kind === 'decision'));
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('commitment selection binds quotations and passes the dated follow-up boundary', async () => {
	const ctx = memory.context('commitment-proof', 'ana');
	const acceptanceId = 'quality-promise';
	const followupId = 'quality-followup';
	for (const [id, text] of [
		[acceptanceId, 'I will send the list.'],
		[followupId, 'I have still not received the list.']
	])
		memory.addSource(ctx, {
			id,
			documentId: 'zz-quality-test',
			title: 'Test obligation',
			type: 'email_thread',
			date: id === acceptanceId ? '2026-07-01' : '2026-07-02',
			level: 1,
			author: 'Example person',
			text,
			position: 'Message',
			participants: []
		});
	const originalFetch = globalThis.fetch;
	let selectionCalls = 0;
	let valid = false;
	globalThis.fetch = async (_url, options) => {
		const prompt = JSON.parse(String(options?.body)).messages.at(-1).content;
		let output: unknown;
		if (prompt.startsWith('Employee request:'))
			output = { action: 'question', needsEvidence: true, research: 'commitments' };
		else if (prompt.startsWith('Find candidate unfulfilled'))
			output = {
				items: prompt.includes('I have still not received the list.')
					? [
							{
								fact: 'A promised list remains undelivered.',
								sourceIds: [acceptanceId, followupId],
								commitment: {
									acceptedAction: 'I will send the list.',
									owner: 'Example person',
									state: 'outstanding',
									acceptanceSourceIds: [acceptanceId],
									followupSourceIds: [followupId]
								}
							}
						]
					: []
			};
		else if (prompt.startsWith('Select the strongest')) {
			selectionCalls++;
			output = {
				candidateIds: ['K1'],
				acceptance: { sourceId: acceptanceId, quote: 'I will send the list.' },
				followup: {
					sourceId: followupId,
					quote: valid ? 'I have still not received the list.' : 'It was delivered.'
				},
				explanation: 'Invalid quotation'
			};
		} else if (valid && (prompt.startsWith('Task:') || prompt.startsWith('Verify this draft'))) {
			assert.match(
				prompt,
				/Temporal reporting boundary: the selected follow-up evidence reaches 2026-07-02/
			);
			output = prompt.startsWith('Task:')
				? {
						text: 'The list remained outstanding at the 2 July follow-up.',
						citations: [{ sourceId: followupId, quote: 'I have still not received the list.' }]
					}
				: {
						statements: [
							{
								text: 'The list remained outstanding at the 2 July follow-up.',
								sourceIds: [followupId]
							}
						]
					};
		} else throw new Error('A draft must not be generated from invalid commitment evidence');
		return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
	};
	try {
		await assert.rejects(
			() => wf.answerQuestion(ctx, 'Find an unfulfilled agreement.'),
			/incomplete structured output/
		);
		assert.equal(selectionCalls, 2);
		assert.equal(wf.workspaceData(ctx).chat.length, 0);
		valid = true;
		const result = await wf.answerQuestion(ctx, 'Find an unfulfilled agreement.');
		assert.match(result.text, /2 July follow-up/);
		assert.equal(wf.workspaceData(ctx).chat.length, 1);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
