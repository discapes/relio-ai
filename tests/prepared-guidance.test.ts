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
test('archive guidance survives navigation, private context changes and reset within the same owner and level', () => {
	const { person } = seed();
	const ctx = memory.context('fresh', 'p1', 3);
	assert.equal(wf.preparedGuidance(ctx, person.id)?.id, 'prepared-lena');
	const original = wf.guidanceFingerprint(ctx);
	wf.workspaceData(ctx);
	assert.equal(wf.guidanceFingerprint(ctx), original);
	assert.equal(wf.preparedGuidance(memory.context('fresh', 'p1', 2), person.id), null);
	assert.equal(wf.preparedGuidance(memory.context('fresh', 'p2', 2), person.id), null);
	wf.savePreference(ctx, 'Focus on bakery decisions.');
	assert.equal(wf.preparedGuidance(ctx, person.id)?.id, 'prepared-lena');
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
test('private chat keeps prepared archive guidance available without starting profile jobs', () => {
	const { person } = seed();
	const ctx = memory.context('chat-with-prepared-guides', 'p1', 3);
	const before = wf.guidanceFingerprint(ctx);
	database()
		.prepare('INSERT INTO wf_artifacts VALUES(?,?,?,?,?,?,?)')
		.run(
			'chat-before-people',
			ctx.workspaceId,
			'p1',
			3,
			0,
			'chat',
			JSON.stringify({
				id: 'chat-before-people',
				text: 'The latest meeting covered bakery.',
				question: 'What happened last meeting?',
				citations: [],
				createdAt: new Date().toISOString(),
				level: 3,
				kind: 'chat',
				trace: []
			})
		);
	assert.notEqual(wf.guidanceFingerprint(ctx), before);
	wf.prepareWorkspace(ctx);
	assert.equal(wf.preparedGuidance(ctx, person.id)?.id, 'prepared-lena');
	assert.equal(wf.workspaceData(ctx).jobs.length, 0);
});
test('changed project evidence cannot silently reuse the original archive guidance', () => {
	const { person } = seed();
	const ctx = memory.context('new-project-evidence', 'p1', 3);
	memory.addSource(ctx, {
		id: 'new-email',
		documentId: 'new-thread',
		title: 'Changed plans',
		type: 'simulated_email',
		date: '2026-07-09',
		author: 'Lena Fischer',
		text: 'The approval meeting moved.',
		level: 1,
		position: 'Message 1',
		participants: ['Lena Fischer']
	});
	assert.equal(wf.preparedGuidance(ctx, person.id), null);
	wf.prepareWorkspace(ctx);
	assert.equal(wf.workspaceData(ctx).jobs.length, 0);
});
test('new workspaces reuse prepared briefs and claims at every supported scope without jobs', () => {
	const baseline = memory.context('prepared-baseline', 'p1', 3);
	wf.prepareWorkspace(baseline);
	for (const owner of memory.personas.filter((p) => p.projects.includes('acme'))) {
		for (let level = 1; level <= owner.level; level++) {
			const id = `brief-${owner.id}-${level}`;
			database()
				.prepare('INSERT INTO wf_artifacts VALUES(?,?,?,?,?,?,?)')
				.run(
					id,
					baseline.workspaceId,
					owner.id,
					level,
					0,
					'brief',
					JSON.stringify({
						id,
						text: 'Prepared morning brief',
						citations: [],
						createdAt: '2026-09-19T00:00:00Z',
						level,
						kind: 'brief',
						trace: []
					})
				);
			database()
				.prepare('INSERT OR IGNORE INTO memory_claims VALUES(?,?,?,?,?)')
				.run(
					baseline.workspaceId,
					`claim-${level}`,
					'acme',
					level,
					JSON.stringify({
						id: `claim-${level}`,
						projectId: 'acme',
						level,
						text: 'Prepared project memory',
						sourceIds: [memory.sources(memory.context('prepared-baseline', 'p1', 1))[0].id],
						status: 'current'
					})
				);
			const ctx = memory.context(`fresh-${owner.id}-${level}`, owner.id, level as 1 | 2 | 3);
			wf.prepareWorkspace(ctx);
			wf.prepareWorkspace(ctx);
			const data = wf.workspaceData(ctx);
			assert.equal(data.brief?.text, 'Prepared morning brief');
			assert.ok(data.claims.length > 0);
			assert.equal(data.jobs.length, 0);
		}
	}
});
test('incomplete prepared data and a later calendar day do not trigger automatic inference', async () => {
	const ctx = memory.context('prepared-data-unavailable', 'p1', 3);
	database()
		.prepare("DELETE FROM wf_artifacts WHERE workspace_id='prepared-baseline' AND kind='brief'")
		.run();
	database().prepare("DELETE FROM memory_claims WHERE workspace_id='prepared-baseline'").run();
	wf.prepareWorkspace(ctx);
	assert.equal(wf.workspaceData(ctx).jobs.length, 0);
	const count = database().prepare('SELECT count(*) n FROM wf_jobs').get()?.n;
	await wf.scheduledRefresh(new Date('2026-09-22T10:00:00Z'));
	assert.equal(database().prepare('SELECT count(*) n FROM wf_jobs').get()?.n, count);
});
test.after(() => rmSync(dir, { recursive: true, force: true }));
