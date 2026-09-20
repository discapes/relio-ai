import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { reviewerGuide } from '../src/lib/server/reviewer';
import type { Context } from '../src/lib/types';

const ctx: Context = {
	workspaceId: 'reference-review', projectId: 'acme', epoch: 0, level: 3,
	persona: { id: 'p1', name: 'Ana Duarte', email: 'ana@example.com', role: 'Project manager', level: 3, projects: ['acme'] }
};

test('reviewer views allow only the four reader documents and no legacy report routes', () => {
	for (const view of ['design', 'how-to-use', 'about', 'practice']) assert.ok(reviewerGuide(ctx, view)?.text);
	for (const view of ['quality', 'evaluation', 'generated', 'validation', 'pitch', 'solution', '../../docs/VALIDATION.md', '__proto__']) assert.equal(reviewerGuide(ctx, view), null);
	for (const file of ['+page.server.ts', '+page.svelte', 'download/+server.ts']) assert.ok(!existsSync(resolve('src/routes/submission/[slug]', file)));
});

test('original-archive practice answers are withheld at lower access, after erasure and outside the project', () => {
	assert.ok(reviewerGuide(ctx, 'practice')!.text.includes('4,214'));
	for (const denied of [{ ...ctx, level: 1 as const }, { ...ctx, epoch: 1 }, { ...ctx, persona: { ...ctx.persona, projects: [] } }]) {
		const guide = reviewerGuide(denied, 'practice')!;
		assert.equal(guide.text, '');
		assert.ok(guide.unavailable);
		assert.ok(!JSON.stringify(guide).includes('4,214'));
		for (const view of ['design', 'how-to-use', 'about']) assert.ok(reviewerGuide(denied, view)!.text);
	}
});

test('design is a short four-topic page and general guides contain no original evidence records', () => {
	const design = reviewerGuide(ctx, 'design')!.text;
	assert.ok(design.split(/\s+/).length <= 500);
	for (const heading of ['How provenance is stored', 'How stale facts are caught', 'How deletion propagates', 'Where inference runs']) assert.ok(design.includes(`## ${heading}`));
	for (const view of ['design', 'how-to-use', 'about']) {
		const text = reviewerGuide(ctx, view)!.text;
		assert.ok(!/\/(?:source|submission)\/|#(?:message|utterance)-/.test(text));
		assert.ok(!/VALIDATION\.md|model_quality_review|quality-probe|npx |npm /.test(text));
	}
});

test('practice links refer to exact original record IDs and every answer supplies source links', () => {
	const ids = new Set<string>();
	function collect(value: unknown) {
		if (Array.isArray(value)) value.forEach(collect);
		else if (value && typeof value === 'object') {
			const record = value as Record<string, unknown>;
			if (typeof record.id === 'string') ids.add(record.id);
			Object.values(record).forEach(collect);
		}
	}
	for (const kind of ['emails', 'transcripts', 'reports'])
		for (const file of readdirSync(resolve('../corpus_parsed/acme', kind)).filter((file) => file.endsWith('.json')))
			collect(JSON.parse(readFileSync(resolve('../corpus_parsed/acme', kind, file), 'utf8')));
	const text = reviewerGuide(ctx, 'practice')!.text;
	for (const match of text.matchAll(/\]\(\/source\/([^\s)]+)\)/g)) assert.ok(ids.has(decodeURIComponent(match[1])), match[1]);
	for (const match of text.matchAll(/`((?:emails|transcripts|reports)\/[^`]+#(?:message|utterance)-\d+)`/g)) assert.ok(ids.has(match[1]), match[1]);
	const answers = text.split(/(?=## P\d\.)/).slice(1);
	assert.equal(answers.length, 9);
	assert.ok(answers.every((answer) => answer.includes('](/source/')));
	assert.ok(!/\.\.\/materials|PRACTICE_ANSWERS\.md|practice_review\.md|npx /.test(text));
});
