import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'receipt-calendar-migration-'));
process.env.DISABLE_BACKGROUND = '1';
const { database } = await import('../src/lib/server/database');
const db = database();
db.exec(
	'CREATE TABLE wf_meetings(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,level INTEGER NOT NULL,payload TEXT NOT NULL)'
);
db.prepare('INSERT INTO wf_meetings VALUES(?,?,?,?)').run(
	'existing',
	'old-workspace',
	1,
	JSON.stringify({
		id: 'existing',
		title: 'Retained meeting',
		date: '2026-07-10',
		attendees: [],
		purpose: 'Existing evidence'
	})
);
const memory = await import('../src/lib/server/memory');
const wf = await import('../src/lib/server/workflows');
test('calendar schema upgrade retains existing meetings and permits workspace-local IDs', () => {
	const ctx = memory.context('old-workspace', 'ana');
	assert.ok(wf.workspaceData(ctx).meetings.some((item) => item.id === 'existing'));
	db.prepare('INSERT INTO wf_meetings VALUES(?,?,?,?)').run('existing', 'other-workspace', 1, '{}');
	assert.equal(
		db.prepare('SELECT COUNT(*) AS n FROM wf_meetings WHERE id=?').get('existing')?.n,
		2
	);
	assert.ok(
		db
			.prepare('PRAGMA table_info(wf_meetings)')
			.all()
			.some((column) => column.name === 'workspace_id' && Number(column.pk) > 0)
	);
});
