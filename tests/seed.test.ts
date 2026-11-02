import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openDatabase } from '../src/lib/server/database';

test('export keeps prepared results only; reset restores them without modifying the seed', () => {
	const dir = mkdtempSync(join(tmpdir(), 'relio-seed-'));
	try {
		const source = openDatabase(join(dir, 'original.sqlite'));
		source.exec(`
			CREATE TABLE memory_workspaces(id TEXT PRIMARY KEY, epoch INTEGER, created_at TEXT);
			CREATE TABLE wf_artifacts(id TEXT PRIMARY KEY, workspace_id TEXT, payload TEXT);
			CREATE TABLE wf_guidance_preparations(workspace_id TEXT, worker_pid INTEGER);
			INSERT INTO memory_workspaces VALUES ('prepared-baseline', 0, '2026-09-20'), ('visitor', 0, '2026-09-21');
			INSERT INTO wf_artifacts VALUES ('prepared', 'prepared-baseline', 'inference result'), ('private', 'visitor', 'private answer');
			INSERT INTO wf_guidance_preparations VALUES ('prepared-baseline', 123);
			INSERT INTO settings VALUES ('session_secret', 'private-key');
		`);
		source.close();
		const exported = spawnSync('python3', [
			'scripts/export-seed.py',
			join(dir, 'original.sqlite'),
			join(dir, 'seed.sqlite')
		]);
		assert.equal(exported.status, 0, exported.stderr.toString());
		const launch = () => {
			const result = spawnSync(
				process.execPath,
				[
					'--import',
					'tsx',
					'--input-type=module',
					'-e',
					`
				import { database } from './src/lib/server/database.ts';
				const db = database();
				console.log(JSON.stringify(db.prepare('SELECT * FROM wf_artifacts').all()));
				db.prepare("INSERT OR REPLACE INTO wf_artifacts VALUES ('runtime', 'visitor', 'new answer')").run();
				db.close();
			`
				],
				{ env: { ...process.env, DATA_DIR: dir } }
			);
			assert.equal(result.status, 0, result.stderr.toString());
			return JSON.parse(result.stdout.toString());
		};
		assert.deepEqual(launch(), [
			{ id: 'prepared', workspace_id: 'prepared-baseline', payload: 'inference result' }
		]);
		assert.equal(launch().length, 2);
		const runtime = openDatabase(join(dir, 'app.sqlite'));
		assert.equal(runtime.prepare('SELECT count(*) AS n FROM settings').get()?.n, 0);
		assert.equal(runtime.prepare('SELECT count(*) AS n FROM wf_guidance_preparations').get()?.n, 0);
		runtime.close();
		rmSync(join(dir, 'app.sqlite'));
		assert.equal(launch().length, 1);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
