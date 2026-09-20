import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const dir = mkdtempSync(resolve(tmpdir(), 'relex-guidance-'));
process.env.DATA_DIR = dir;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const wf = await import('../src/lib/server/workflows');
const { database } = await import('../src/lib/server/database');
function seed() {
	const ctx = memory.context('prepared-baseline', 'p1', 3);
	const person = memory.people(ctx).find((p) => p.name === 'Lena Fischer')!;
	const fingerprint = wf.guidanceFingerprint(ctx);
	const answer = {
		id: 'prepared-lena',
		text: 'Prepared project guidance',
		citations: [],
		createdAt: '2026-09-20T00:00:00Z',
		kind: 'guidance',
		level: 3,
		trace: []
	};
	database()
		.prepare('INSERT OR IGNORE INTO wf_people_guidance VALUES(?,?,?,?,?,?,?,?)')
		.run(
			ctx.workspaceId,
			ctx.projectId,
			ctx.persona.id,
			ctx.level,
			ctx.epoch,
			person.id,
			fingerprint,
			JSON.stringify(answer)
		);
	return { ctx, person };
}
test('prepared guidance survives reset and navigation while owner, level and private context remain scoped', () => {
	const { person } = seed();
	const ctx = memory.context('fresh', 'p1', 3);
	assert.equal(wf.preparedGuidance(ctx, person.id)?.id, 'prepared-lena');
	const original = wf.guidanceFingerprint(ctx);
	wf.workspaceData(ctx);
	assert.equal(wf.guidanceFingerprint(ctx), original);
	assert.equal(wf.preparedGuidance(memory.context('fresh', 'p1', 2), person.id), null);
	assert.equal(wf.preparedGuidance(memory.context('fresh', 'p2', 2), person.id), null);
	wf.savePreference(ctx, 'Focus on bakery decisions.');
	assert.equal(wf.preparedGuidance(ctx, person.id), null);
	const reset = memory.context(wf.reset(ctx), 'p1', 3);
	assert.equal(wf.preparedGuidance(reset, person.id)?.id, 'prepared-lena');
	assert.equal(database().prepare('SELECT count(*) n FROM wf_people_guidance').get()?.n, 1);
});
test('erasure prevents baseline reintroduction without deleting other workspaces preparation', () => {
	const { person } = seed();
	const ctx = memory.context('erase-guidance', 'p1', 3);
	wf.erase(ctx, person.id);
	assert.equal(wf.preparedGuidance(memory.context('erase-guidance', 'p1', 3), person.id), null);
	assert.equal(database().prepare('SELECT count(*) n FROM wf_people_guidance').get()?.n, 1);
});
test('all profile preparation queues once and navigation preserves durable jobs', () => {
	const ctx = memory.context('queued-guidance', 'p1', 1);
	wf.ensurePeopleGuidance(ctx);
	const first = wf.workspaceData(ctx).jobs;
	assert.equal(first.length, memory.people(ctx).length);
	wf.ensurePeopleGuidance(ctx);
	assert.deepEqual(wf.workspaceData(ctx).jobs, first);
	const row = database()
		.prepare('SELECT id FROM wf_jobs WHERE workspace_id=? LIMIT 1')
		.get(ctx.workspaceId)!;
	database()
		.prepare(
			"UPDATE wf_jobs SET status='failed',error='Application restarted. Retry this task.' WHERE id=?"
		)
		.run(String(row.id));
	wf.ensurePeopleGuidance(ctx);
	assert.ok(wf.workspaceData(ctx).jobs.every((job) => job.status === 'queued'));
});
test('live baseline preparation prevents duplicate visitor work and completed rows remain available', () => {
	const base = memory.context('prepared-baseline', 'p1', 1);
	wf.registerGuidancePreparation(base);
	const visitor = memory.context('visitor-warming', 'p1', 1);
	wf.ensurePeopleGuidance(visitor);
	assert.equal(wf.workspaceData(visitor).jobs.length, 0);
	wf.finishGuidancePreparation();
	wf.ensurePeopleGuidance(visitor);
	assert.equal(wf.workspaceData(visitor).jobs.length, memory.people(visitor).length);
});
test.after(() => rmSync(dir, { recursive: true, force: true }));
