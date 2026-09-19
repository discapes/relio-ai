import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, workspaceName, saveWorkspaceName } from '../src/lib/server/database';
test('settings survive reopening and reject invalid values without losing the saved name', () => {
	const dir = mkdtempSync(join(tmpdir(), 'workspace-test-'));
	let db = openDatabase(join(dir, 'test.sqlite'));
	try {
		assert.equal(workspaceName(db), 'Workspace');
		saveWorkspaceName("  Team's workspace  ", db);
		db.close();
		db = openDatabase(join(dir, 'test.sqlite'));
		assert.equal(workspaceName(db), "Team's workspace");
		for (const name of ['', '   ', 'a'.repeat(61)])
			assert.throws(() => saveWorkspaceName(name, db));
		assert.equal(workspaceName(db), "Team's workspace");
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});
