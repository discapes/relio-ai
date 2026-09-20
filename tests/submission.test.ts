import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionDocument } from '../src/lib/server/submission';
import type { Context } from '../src/lib/types';
const ctx: Context = {
	workspaceId: 'reference-review',
	projectId: 'acme',
	epoch: 0,
	level: 3,
	persona: {
		id: 'p1',
		name: 'Ana Duarte',
		email: 'ana@example.com',
		role: 'Project manager',
		level: 3,
		projects: ['acme']
	}
};
test('reviewed submission documents are allowlisted and available in an unerased L3 workspace', () => {
	assert.ok(submissionDocument(ctx, 'answers').text.includes('Reviewed practice answers'));
	assert.throws(
		() => submissionDocument(ctx, '../../materials/corpus/acme/00_README'),
		(error: unknown) => (error as { status: number }).status === 404
	);
});
test('source-bearing submission documents respect level and erasure boundaries', () => {
	for (const denied of [
		{ ...ctx, level: 1 as const },
		{ ...ctx, epoch: 1 },
		{ ...ctx, persona: { ...ctx.persona, projects: [] } }
	])
		assert.throws(
			() => submissionDocument(denied, 'answers'),
			(error: unknown) => (error as { status: number }).status === 403
		);
});
