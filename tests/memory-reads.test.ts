import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Source } from '../src/lib/types';

const directory = mkdtempSync(resolve(tmpdir(), 'relio-reads-'));
process.env.DATA_DIR = directory;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const { database } = await import('../src/lib/server/database');
const message = (id: string, level: 1 | 2 | 3 = 1): Source => ({
	id,
	documentId: id,
	title: 'New project message',
	type: 'email_thread',
	date: '2026-09-20',
	author: 'Test Person',
	text: 'Test Person owns the new handoff.',
	level,
	position: 'Message 1',
	participants: ['Test Person']
});

test('optimized People output preserves all original names, aliases, roles and evidence at every level', () => {
	// SHA-256 of the complete original People output, captured before optimizing the algorithm.
	const expected = [
		'beb4cc68aadb7911639f3db413173977f7ca94980b9151ecf32c5758f78d3728',
		'3804f556b83398d99c1ecfe7dece991eb189f78736fb9f8c4ed43a9229e2ab70',
		'af597907ab37b2976fcdaf19dce88e36cea90292185998ce112bd8d3e0ef90e5'
	];
	for (const level of [1, 2, 3] as const) {
		const people = memory.people(memory.context('corpus', 'p1', level));
		assert.equal(
			createHash('sha256').update(JSON.stringify(people)).digest('hex'),
			expected[level - 1]
		);
	}
});

test('scoped reads retain workspace, project and access boundaries and observe same-load writes', () => {
	const high = memory.context('reads', 'p1', 3);
	const low = memory.context('reads', 'p3', 1);
	const foreign = memory.context('reads', 'p4', 3);
	const other = memory.context('other-reads', 'p1', 3);
	memory.withMemoryReads(() => {
		const original = memory.sources(high).length;
		memory.people(high);
		memory.addSource(high, message('restricted-handoff', 3));
		assert.equal(memory.sources(high).length, original + 1);
		assert.ok(memory.people(high).some((p) => p.name === 'Test Person'));
		assert.ok(!memory.sources(low).some((s) => s.id === 'restricted-handoff'));
		assert.ok(!memory.people(low).some((p) => p.name === 'Test Person'));
		assert.deepEqual(memory.people(foreign), []);
		assert.deepEqual(memory.sources(foreign), []);
		assert.ok(!memory.sources(other).some((s) => s.id === 'restricted-handoff'));
	});
});

test('commits from a separate connection invalidate reused source and People reads', () => {
	const ctx = memory.context('external-writes', 'p1', 3);
	const writer = new DatabaseSync(resolve(directory, 'app.sqlite'));
	try {
		memory.withMemoryReads(() => {
			const original = memory.sources(ctx).length;
			memory.people(ctx);
			const source = message('external-handoff');
			writer
				.prepare('INSERT INTO memory_sources VALUES(?,?,?,?,?,?)')
				.run(ctx.workspaceId, source.id, ctx.projectId, 1, JSON.stringify(source), 'Test import');
			assert.equal(memory.sources(ctx).length, original + 1);
			assert.ok(memory.people(ctx).some((p) => p.name === 'Test Person'));
		});
	} finally {
		writer.close();
	}
});

test('erasure clears reused People and sources and prevents stale-epoch reads', () => {
	const ctx = memory.context('erasure-reads', 'p1', 3);
	memory.addSource(ctx, message('erased-handoff'));
	memory.withMemoryReads(() => {
		assert.ok(memory.people(ctx).some((p) => p.id === 'test-person'));
		memory.sources(ctx);
		memory.erasePerson(ctx, 'test-person');
		assert.deepEqual(memory.sources(ctx), []);
		assert.deepEqual(memory.people(ctx), []);
		const current = memory.context(ctx.workspaceId, 'p1', 3);
		assert.ok(!memory.people(current).some((p) => p.id === 'test-person'));
		assert.ok(!memory.sources(current).some((s) => s.id === 'erased-handoff'));
		assert.ok(memory.people(current).some((p) => p.name === 'Lena Fischer'));
	});
});

test('read scopes end after exceptions and asynchronous continuations observe later writes', async () => {
	const ctx = memory.context('read-lifetime', 'p1', 3);
	assert.throws(
		() =>
			memory.withMemoryReads(() => {
				memory.people(ctx);
				throw new Error('Aborted load');
			}),
		/Aborted load/
	);
	const later = memory.withMemoryReads(() => {
		memory.sources(ctx);
		return Promise.resolve().then(() => memory.sources(ctx));
	});
	memory.addSource(ctx, message('later-handoff'));
	assert.ok((await later).some((s) => s.id === 'later-handoff'));
	assert.ok(memory.people(ctx).some((p) => p.name === 'Test Person'));
});

test.after(() => {
	database().close();
	rmSync(directory, { recursive: true, force: true });
});
