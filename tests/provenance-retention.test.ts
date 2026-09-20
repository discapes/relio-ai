import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Answer, Source } from '../src/lib/types';
import { retainAnswer } from '../src/lib/server/answer-retention';
const dir = mkdtempSync(join(tmpdir(), 'relio-retention-'));
process.env.DATA_DIR = dir;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const wf = await import('../src/lib/server/workflows');
const { database } = await import('../src/lib/server/database');
const source: Source = {
	id: 'independent-bakery',
	documentId: 'independent-bakery',
	title: 'Bakery plan',
	type: 'email',
	date: '2026-07-07',
	author: 'Lena Fischer',
	text: 'Bakery planning continues on Thursday.',
	level: 1,
	position: 'Message 1',
	participants: ['Lena Fischer']
};
const answer: Answer = {
	id: 'retained-answer',
	text: 'Bakery planning continues on Thursday. [1]',
	citations: [
		{
			sourceId: source.id,
			quote: source.text,
			title: source.title,
			date: source.date,
			author: source.author,
			position: source.position
		}
	],
	createdAt: '2026-07-07',
	kind: 'brief',
	level: 3,
	trace: []
};

test('removing an affected paragraph preserves exact support and renumbers surviving citations', () => {
	const original = {
		...answer,
		text: 'Removed contribution. [1]\n\nBakery continues. [2]\n\nThey must follow up. [1]',
		citations: [{ ...answer.citations[0], sourceId: 'withdrawn' }, answer.citations[0]]
	};
	const retained = retainAnswer(original, new Map([[source.id, source]]), () => false)!;
	assert.equal(retained.text, 'Bakery continues. [1]');
	assert.deepEqual(retained.citations, answer.citations);
	assert.match(retained.snapshotNote!, /passages were removed/);
	for (const marker of ['[1, 2]', '[1-2]', '[1–2]']) {
		const list = retainAnswer(
			{ ...original, text: `Combined support. ${marker}\n\nBakery continues. [2]` },
			new Map([[source.id, source]]),
			() => false
		)!;
		assert.equal(list.text, 'Bakery continues. [1]');
	}

	assert.equal(
		retainAnswer(
			{ ...answer, text: 'Unsupported prose.' },
			new Map([[source.id, source]]),
			() => false
		),
		null
	);
});

test('erasure retains independent claims, brief passages and baseline-backed People guidance without inference', async () => {
	const baseline = memory.context('prepared-baseline', 'p1', 3);
	wf.prepareWorkspace(baseline);
	memory.addSource(baseline, source);
	const ctx = memory.context('selective', 'p1', 3);
	memory.addSource(ctx, source);
	const kwame = memory.people(ctx).find((person) => person.id === 'kwame-boateng')!;
	const affected = memory.sources(ctx).find((item) => item.author.includes('Kwame'))!;
	const mixed = {
		...answer,
		text: `Removed contribution by Kwame Boateng. [1]\n\n${answer.text.replace('[1]', '[2]')}`,
		citations: [
			{
				...answer.citations[0],
				sourceId: affected.id,
				quote: affected.text,
				author: affected.author
			},
			answer.citations[0]
		]
	};
	database()
		.prepare('INSERT INTO wf_artifacts VALUES(?,?,?,?,?,?,?)')
		.run(mixed.id, ctx.workspaceId, 'p1', 3, 0, 'brief', JSON.stringify(mixed));
	memory.replaceClaims(ctx, [
		{
			id: 'surviving-claim',
			kind: 'decision',
			text: 'Bakery planning continues on Thursday.',
			status: 'current',
			level: 3,
			sourceIds: [source.id]
		},
		{
			id: 'affected-claim',
			kind: 'decision',
			text: 'Kwame contributed.',
			status: 'current',
			level: 3,
			sourceIds: [affected.id]
		}
	]);
	database()
		.prepare('INSERT INTO wf_people_guidance VALUES(?,?,?,?,?,?,?,?)')
		.run(
			baseline.workspaceId,
			'acme',
			'p1',
			3,
			0,
			'lena-fischer',
			wf.guidanceFingerprint(baseline),
			JSON.stringify({ ...mixed, id: 'baseline-lena', kind: 'guidance' })
		);
	assert.ok(wf.preparedGuidance(ctx, 'lena-fischer'));
	wf.erase(ctx, kwame.id);
	const current = memory.context(ctx.workspaceId, 'p1', 3);
	const data = wf.workspaceData(current);
	assert.equal(data.claims.length, 1);
	assert.equal(data.claims[0].id, 'surviving-claim');
	assert.equal(data.brief?.text, answer.text);
	const guidance = wf.preparedGuidance(current, 'lena-fischer');
	assert.equal(guidance?.text, answer.text);
	assert.equal(wf.preparedGuidance(current, kwame.id), null);
	assert.doesNotMatch(JSON.stringify({ data, guidance }), /kwame|boateng/i);
	wf.prepareWorkspace(current);
	assert.equal(wf.workspaceData(current).jobs.length, 0);
	assert.match(
		String(
			database()
				.prepare("SELECT payload FROM wf_people_guidance WHERE workspace_id='prepared-baseline'")
				.get()?.payload
		),
		/Kwame/
	);
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => {
		throw new Error('Deletion receipt must not need inference');
	};
	try {
		const followup = await wf.answerQuestion(current, 'What remains after deleting Kwame Boateng?');
		assert.match(followup.text, /source records.*remain/);
		assert.doesNotMatch(JSON.stringify(followup), /kwame|boateng/i);
		assert.doesNotMatch(JSON.stringify(wf.workspaceData(current)), /kwame|boateng/i);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('suppressed identities are sanitized as complete spans without removing unrelated question text', () => {
	const ctx = memory.context('selective', 'p1', 3);
	assert.equal(
		memory.sanitizeErasedText(ctx.workspaceId, 'What remains after deleting Kwame Boateng?'),
		'What remains after deleting the removed person?'
	);
	assert.equal(
		memory.sanitizeErasedText(ctx.workspaceId, 'Could Kwame explain the bakery plan?'),
		'Could the removed person explain the bakery plan?'
	);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
