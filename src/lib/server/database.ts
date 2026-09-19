import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function openDatabase(path: string) {
	const db = new DatabaseSync(path);
	db.exec(`PRAGMA journal_mode = WAL;
 CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
	return db;
}
let connection: DatabaseSync | undefined;
export function database() {
	if (!connection) {
		const dir = resolve(process.env.DATA_DIR || 'data');
		mkdirSync(dir, { recursive: true, mode: 0o700 });
		connection = openDatabase(resolve(dir, 'app.sqlite'));
	}
	return connection;
}
export function workspaceName(db = database()): string {
	const row = db.prepare("SELECT value FROM settings WHERE key = 'workspace_name'").get();
	return row ? String(row.value) : 'Workspace';
}
export function saveWorkspaceName(name: string, db = database()) {
	const value = name.trim();
	if (!value || value.length > 60) throw new Error('Enter a name between 1 and 60 characters.');
	db.prepare(
		"INSERT INTO settings (key, value) VALUES ('workspace_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
	).run(value);
}
