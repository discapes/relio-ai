import test from 'node:test';
import assert from 'node:assert/strict';
import { modelJSON, sourceExcerpt } from '../src/lib/server/model';
import type { Source } from '../src/lib/types';
test('structured-output retry rejects an echoed input shape and preserves required output', async () => {
	const original = globalThis.fetch;
	let calls = 0;
	globalThis.fetch = async () =>
		Response.json({
			choices: [
				{
					message: {
						content: JSON.stringify(
							++calls === 1
								? { request: 'echo' }
								: {
										statements: [{ text: 'Evidence unavailable', sourceIds: [], evidenceGap: true }]
									}
						)
					}
				}
			]
		});
	try {
		const result = await modelJSON<{ statements: unknown[] }>(
			'Return statements.',
			'Question',
			undefined,
			undefined,
			false,
			1,
			['statements']
		);
		assert.equal(calls, 2);
		assert.equal(result.statements.length, 1);
	} finally {
		globalThis.fetch = original;
	}
});
test('email excerpts preserve exact source text while removing transport banner and signature', () => {
	const source: Source = {
		id: 'email',
		documentId: 'email',
		title: 'Pilot',
		type: 'email',
		date: '2026-07-06',
		level: 1,
		position: 'Message 1',
		participants: ['Lena Fischer'],
		text: 'This email originated from outside RELEX.\n\nThe pilot covers 25 stores.\n\nLena Fischer\nIT director\nFooter',
		author: 'Lena Fischer',
		email: { from: 'lena@example.com', to: [], cc: [] }
	};
	const excerpt = sourceExcerpt(source);
	assert.equal(excerpt, 'The pilot covers 25 stores.');
	assert.ok(source.text.includes(excerpt));
});

test('record validation repairs document-only citations before accepting extraction', async () => {
	const { evidenceOutputIssue } = await import('../src/lib/server/model');
	const sources = [
		{
			id: 'transcripts/01_example#utterance-0001',
			documentId: 'transcripts/01_example',
			text: 'I will deliver the list.',
			author: 'Alex'
		}
	] as Source[];
	const original = globalThis.fetch;
	const requests: any[] = [];
	globalThis.fetch = async (_url, options) => {
		requests.push(JSON.parse(String(options?.body)));
		return Response.json({
			choices: [
				{
					message: {
						content: JSON.stringify({
							claims: [
								{
									text: 'Alex promised the list.',
									sourceIds: requests.length === 1 ? ['transcripts/01_example'] : ['T01U0001']
								}
							]
						})
					}
				}
			]
		});
	};
	try {
		const output = await modelJSON<{ claims: { sourceIds: string[] }[] }>(
			'Extract',
			'Sources',
			undefined,
			undefined,
			false,
			1,
			['claims'],
			(value) => evidenceOutputIssue(value, 'claims', 'text', sources)
		);
		assert.equal(requests.length, 2);
		assert.match(requests[1].messages[1].content, /whole document/);
		assert.deepEqual(output.claims[0].sourceIds, ['T01U0001']);
		assert.ok(
			evidenceOutputIssue(
				{ claims: [{ text: 'Claim', sourceIds: ['T02U0001'] }] },
				'claims',
				'text',
				sources
			)
		);
		assert.ok(
			evidenceOutputIssue({ claims: [{ text: 'Claim', sourceIds: [] }] }, 'claims', 'text', sources)
		);
		assert.equal(
			evidenceOutputIssue(
				{ statements: [{ text: 'Evidence unavailable.', sourceIds: [], evidenceGap: true }] },
				'statements',
				'text',
				sources,
				true
			),
			undefined
		);
	} finally {
		globalThis.fetch = original;
	}
});

test('resolved commitment state requires acceptance and follow-up record references', async () => {
	const { evidenceOutputIssue } = await import('../src/lib/server/model');
	const sources = [1, 2].map((n) => ({
		id: `emails/01_example#message-00${n}`,
		documentId: 'emails/01_example'
	})) as Source[];
	const commitment = {
		acceptedAction: 'I will send the list.',
		owner: 'Alex',
		state: 'outstanding',
		acceptanceSourceIds: ['E01M001'],
		followupSourceIds: [] as string[]
	};
	const output = {
		items: [{ fact: 'The list was promised and later chased.', sourceIds: ['E01M001'], commitment }]
	};
	assert.match(evidenceOutputIssue(output, 'items', 'fact', sources) || '', /follow-up/);
	commitment.followupSourceIds = ['E01M002'];
	assert.equal(evidenceOutputIssue(output, 'items', 'fact', sources), undefined);
	commitment.followupSourceIds = ['E02M001'];
	assert.match(evidenceOutputIssue(output, 'items', 'fact', sources) || '', /unavailable record/);
});

test('bounded extraction retains document coverage before additional claims from the same document', async () => {
	const { boundedEvidenceEntries } = await import('../src/lib/server/model');
	const sources = [1, 2, 3].map((n) => ({
		id: `emails/0${n}_example#message-001`,
		documentId: `emails/0${n}_example`
	})) as Source[];
	const entries = [1, 1, 1, 2, 2, 3].map((n, index) => ({ index, sourceIds: [`E0${n}M001`] }));
	assert.deepEqual(
		boundedEvidenceEntries(entries, sources, 3).map((entry) => entry.index),
		[0, 3, 5]
	);
	assert.deepEqual(
		boundedEvidenceEntries(entries, sources, 4).map((entry) => entry.index),
		[0, 1, 3, 5]
	);
});
