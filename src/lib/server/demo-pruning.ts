import type { DatabaseSync } from 'node:sqlite';

const hour = 3_600_000;
const visitor = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|demo_[a-f0-9]{32})$/;

export function demoPruning(db: DatabaseSync, setting: string | undefined) {
	const hours = Number(setting);
	if (!Number.isSafeInteger(hours) || hours < 1) return;
	db.exec('CREATE TABLE IF NOT EXISTS demo_activity(workspace_id TEXT PRIMARY KEY, seen INTEGER NOT NULL)');
	const touch = db.prepare(`INSERT INTO demo_activity VALUES (?,?) ON CONFLICT(workspace_id)
		DO UPDATE SET seen=excluded.seen WHERE seen < excluded.seen`);
	function prune(now = Date.now()) {
		db.exec('BEGIN IMMEDIATE');
		try {
			const expired = db.prepare(`SELECT id FROM memory_workspaces LEFT JOIN demo_activity ON workspace_id=id
				WHERE coalesce(seen, unixepoch(created_at)*1000) < ?`).all(now - hours * hour)
				.map(r => String(r.id)).filter(id => visitor.test(id)).slice(0, 32);
			if (expired.length) {
				const tables = db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND EXISTS
					(SELECT 1 FROM pragma_table_info(sqlite_schema.name) WHERE name='workspace_id')`).all();
				for (const { name } of tables) {
					const del = db.prepare(`DELETE FROM "${String(name).replaceAll('"','""')}" WHERE workspace_id=?`);
					for (const id of expired) del.run(id);
				}
				const del = db.prepare('DELETE FROM memory_workspaces WHERE id=?');
				for (const id of expired) del.run(id);
			}
			db.exec('COMMIT');
			return expired.length;
		} catch (error) {
			db.exec('ROLLBACK');
			throw error;
		}
	}
	return { prune, touch(id: string) { if (visitor.test(id)) touch.run(id, Math.ceil(Date.now() / 60_000) * 60_000); } };
}
