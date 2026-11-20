import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoPruning } from '../src/lib/server/demo-pruning.ts';

test('expires inactive browser data while preserving recent visits and the prepared baseline', () => {
	const db = new DatabaseSync(':memory:');
	db.exec('CREATE TABLE memory_workspaces(id TEXT PRIMARY KEY, created_at TEXT); CREATE TABLE wf_mail(workspace_id TEXT, payload TEXT)');
	const active = randomUUID(), stale = randomUUID();
	for (const id of [active, stale, 'prepared-baseline']) {
		db.prepare('INSERT INTO memory_workspaces VALUES (?,?)').run(id, '2020-01-01');
		db.prepare('INSERT INTO wf_mail VALUES (?,?)').run(id, 'example');
	}
	assert.equal(demoPruning(db, undefined), undefined);
	const policy = demoPruning(db, '24')!;
	policy.touch(active);
	assert.equal(policy.prune(), 1);
	assert.deepEqual(db.prepare('SELECT workspace_id FROM wf_mail').all().map(r => r.workspace_id), [active, 'prepared-baseline']);
	assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memory_workspaces').get()?.n, 2);
	db.close();
});
