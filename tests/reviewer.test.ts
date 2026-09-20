import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const directory = mkdtempSync(resolve(tmpdir(), 'relio-reviewer-'));
process.env.DATA_DIR = directory;
process.env.DISABLE_BACKGROUND = '1';
const { reviewerGuide } = await import('../src/lib/server/reviewer');
const memory = await import('../src/lib/server/memory');
const { database } = await import('../src/lib/server/database');
const ctx = memory.context('reference-review', 'p1', 3);

test('reviewer views allow only the four reader documents and no legacy report routes', () => {
	for (const view of ['design', 'how-to-use', 'about', 'practice'])
		assert.ok(reviewerGuide(ctx, view)?.text);
	for (const view of [
		'quality',
		'evaluation',
		'generated',
		'validation',
		'pitch',
		'solution',
		'../../docs/VALIDATION.md',
		'__proto__'
	])
		assert.equal(reviewerGuide(ctx, view), null);
	for (const file of ['+page.server.ts', '+page.svelte', 'download/+server.ts'])
		assert.ok(!existsSync(resolve('src/routes/submission/[slug]', file)));
});

test('practice answers remain available at lower access with restricted paragraphs withheld', () => {
	assert.ok(reviewerGuide(ctx, 'practice')!.text.includes('4,214'));
	assert.ok(!/This answer is (partial|unavailable)/.test(reviewerGuide(ctx, 'practice')!.text));
	const low = reviewerGuide(memory.context(ctx.workspaceId, 'p1', 1), 'practice')!;
	assert.ok(low.text.includes('4,214'));
	assert.equal(low.text.match(/## P\d\./g)?.length, 9);
	assert.ok(!low.text.includes('2 July internal resourcing conversation'));
	assert.ok(!low.text.includes('INTERNAL-renewal-resourcing'));
	assert.ok(low.text.includes('Katarina made closure'));
	assert.ok(low.text.includes('requires higher access'));
	const denied = reviewerGuide(memory.context(ctx.workspaceId, 'p4'), 'practice')!;
	assert.equal(denied.text, '');
	assert.ok(denied.unavailable);
});

test('erasure removes affected paragraphs and rows while other answers and independent evidence survive', () => {
	const before = memory.context('erased-practice', 'p1', 3);
	memory.erasePerson(before, 'kwame-boateng');
	const current = memory.context(before.workspaceId, 'p1', 3);
	const guide = reviewerGuide(current, 'practice')!;
	assert.equal(guide.text.match(/## P\d\./g)?.length, 9);
	assert.ok(!/kwame|4,214|3,105/i.test(guide.text));
	assert.ok(guide.text.includes('Lena Fischer confirmed signing'));
	assert.ok(guide.text.includes('daily ordering, daily delivery on fast lines'));
	assert.ok(guide.text.includes("Priya's 28 October email"));
	assert.ok(guide.text.includes('This answer is partial'));
	for (const match of guide.text.matchAll(/\]\(\/source\/([^\s)]+)\)/g))
		assert.ok(memory.getSource(current, decodeURIComponent(match[1])));
});

test('additional erasures preserve supported sections without returning suppressed identities or broken links', () => {
	for (const person of ['sofia-almeida', 'lena-fischer']) {
		const before = memory.context(`erased-${person}`, 'p1', 3);
		memory.erasePerson(before, person);
		const current = memory.context(before.workspaceId, 'p1', 3);
		const guide = reviewerGuide(current, 'practice')!;
		assert.equal(memory.isSuppressed(current.workspaceId, guide.text), false);
		assert.equal(guide.text.match(/## P\d\./g)?.length, 9);
		assert.ok(guide.text.includes('](/source/'));
		for (const match of guide.text.matchAll(/\]\(\/source\/([^\s)]+)\)/g))
			assert.ok(memory.getSource(current, decodeURIComponent(match[1])));
	}
});

test('changed citation text withdraws only its dependent units and unrelated additions preserve answers', () => {
	const current = memory.context('modified-practice', 'p1', 3);
	const original = reviewerGuide(current, 'practice')!.text;
	const id = 'emails/15_uat-signoff#message-002';
	const source = memory.getSource(current, id)!;
	memory
		.db()
		.prepare('UPDATE memory_sources SET payload=? WHERE workspace_id=? AND id=?')
		.run(
			JSON.stringify({ ...source, text: 'The original statement has been withdrawn.' }),
			current.workspaceId,
			id
		);
	const changed = reviewerGuide(current, 'practice')!.text;
	assert.ok(!changed.includes('Lena Fischer confirmed signing'));
	assert.ok(changed.includes('98% and 95%'));
	assert.ok(changed.includes('4,214'));
	memory.addSource(current, {
		...source,
		id: 'new-unrelated-message',
		documentId: 'new-unrelated',
		text: 'A new unrelated project update.'
	});
	assert.equal(reviewerGuide(current, 'practice')!.text, changed);
	assert.notEqual(original, changed);
});

test('design is a short four-topic page and general guides contain no original evidence records', () => {
	const design = reviewerGuide(ctx, 'design')!.text;
	assert.ok(design.split(/\s+/).length <= 500);
	for (const heading of [
		'How provenance is stored',
		'How stale facts are caught',
		'How deletion propagates',
		'Where inference runs'
	])
		assert.ok(design.includes(`## ${heading}`));
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
		for (const file of readdirSync(resolve('../corpus_parsed/acme', kind)).filter((file) =>
			file.endsWith('.json')
		))
			collect(JSON.parse(readFileSync(resolve('../corpus_parsed/acme', kind, file), 'utf8')));
	const text = reviewerGuide(ctx, 'practice')!.text;
	for (const match of text.matchAll(/\]\(\/source\/([^\s)]+)\)/g))
		assert.ok(ids.has(decodeURIComponent(match[1])), match[1]);
	for (const match of text.matchAll(
		/`((?:emails|transcripts|reports)\/[^`]+#(?:message|utterance)-\d+)`/g
	))
		assert.ok(ids.has(match[1]), match[1]);
	const answers = text.split(/(?=## P\d\.)/).slice(1);
	assert.equal(answers.length, 9);
	assert.ok(answers.every((answer) => answer.includes('](/source/')));
	assert.ok(!/\.\.\/materials|PRACTICE_ANSWERS\.md|practice_review\.md|npx /.test(text));
});

test.after(() => {
	database().close();
	rmSync(directory, { recursive: true, force: true });
});
