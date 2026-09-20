import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citationTokens, groupCitations, passagePosition } from '../src/lib/presentation/citations';
import type { Citation } from '../src/lib/types';

const receipt = (sourceId: string, position = '1:00 · utterance 1'): Citation => ({
	sourceId,
	position,
	title: 'Review',
	date: '2026-06-16',
	author: 'Ana Duarte',
	quote: 'Exact recorded words.'
});
const citations = [1, 2, 3, 4].map((i) => receipt(`transcripts/review#utterance-000${i}`));

test('inline receipt runs combine while retaining the exact reference indices', () => {
	const tokens = citationTokens('First [1] [2] [3]. Second [4, 2]. Range [1–3].', citations);
	assert.deepEqual(
		tokens.filter((t) => t.type === 'references').map((t) => [t.label, t.numbers]),
		[
			['1–3', [1, 2, 3]],
			['4, 2', [4, 2]],
			['1–3', [1, 2, 3]]
		]
	);
	assert.equal(
		tokens.map((t) => t.text).join(''),
		'First [1] [2] [3]. Second [4, 2]. Range [1–3].'
	);
});

test('invalid and missing references remain text; text and markup are never interpreted as HTML', () => {
	const input = '<script>alert(1)</script> [0] [9] [2-1] [1, 8] [2026] [1-2-3]';
	assert.ok(citationTokens(input, citations).every((t) => t.type === 'text'));
	assert.equal(
		citationTokens(input, citations)
			.map((t) => t.text)
			.join(''),
		input
	);
	assert.deepEqual(citationTokens('[1]', []), [{ type: 'text', text: '[1]' }]);
	assert.deepEqual(
		citationTokens('[1] [99] [2]', citations)
			.filter((token) => token.type === 'references')
			.map((token) => token.numbers),
		[[1], [2]]
	);
});

test('groups retain every receipt and original number; passages require consecutive transcript turns', () => {
	const input = [
		receipt('transcripts/review#utterance-0011', '2:10 · utterance 11'),
		receipt('emails/review#message-001'),
		receipt('transcripts/review#utterance-0010', '2:05 · utterance 10'),
		receipt('transcripts/review#utterance-0013', '2:30 · utterance 13'),
		receipt('emails/review#message-002')
	];
	const groups = groupCitations(input);
	assert.equal(groups.length, 2);
	assert.deepEqual(
		groups[0].passages.map((p) => p.map((c) => c.number)),
		[[3, 1], [4]]
	);
	assert.deepEqual(
		groups[1].passages.map((p) => p.map((c) => c.number)),
		[[2], [5]]
	);
	assert.equal(passagePosition(groups[0].passages[0]), '2:05 – 2:10');
	assert.equal(groups.flatMap((g) => g.excerpts).length, input.length);
	for (const group of groups)
		for (const citation of group.excerpts) {
			const { number, ...original } = citation;
			assert.deepEqual(original, input[number - 1]);
		}
});

test('documents with the same displayed title remain separate', () => {
	assert.equal(
		groupCitations([receipt('emails/a#message-001'), receipt('emails/b#message-001')]).length,
		2
	);
});
