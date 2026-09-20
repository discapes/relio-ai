import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'receipt-session-test-'));
const { sessionContext, setWorkspaceCookie } = await import('../src/lib/server/session');
const { context } = await import('../src/lib/server/memory');
function cookies(initial: Record<string, string> = {}) {
	const values = { ...initial };
	return {
		values,
		get: (key: string) => values[key],
		set: (key: string, value: string) => {
			values[key] = value;
		}
	};
}

test('reserved and unsigned known workspace cookies cannot choose a browser workspace', () => {
	const victim = '60000000-0000-4000-8000-000000000001';
	context(victim, 'ana');
	for (const forged of ['prepared-baseline', victim, `${victim}.wrong`]) {
		const jar = cookies({ relex_workspace: forged });
		const session = sessionContext(jar as never);
		assert.notEqual(session.workspaceId, forged);
		assert.notEqual(session.workspaceId, victim);
		assert.equal(jar.values.relex_session_notice, 'upgraded');
		assert.match(jar.values.relex_workspace, /\.[A-Za-z0-9_-]{43}$/);
	}
});
test('signed browser session persists and signing key stays private outside releases', () => {
	const jar = cookies();
	const first = sessionContext(jar as never);
	const token = jar.values.relex_workspace;
	const key = readFileSync(join(process.env.DATA_DIR!, '.session-secret'));
	assert.equal(key.length, 32);
	assert.equal(statSync(join(process.env.DATA_DIR!, '.session-secret')).mode & 0o777, 0o600);
	assert.equal(sessionContext(jar as never).workspaceId, first.workspaceId);
	assert.equal(jar.values.relex_workspace, token);
	assert.throws(() => setWorkspaceCookie(jar as never, 'prepared-baseline'));
	const other = cookies();
	setWorkspaceCookie(other as never, 'demo_0123456789abcdef0123456789abcdef');
	assert.equal(sessionContext(other as never).workspaceId, 'demo_0123456789abcdef0123456789abcdef');
});

test('copying a valid signature onto another workspace ID does not grant access', () => {
	const jar = cookies();
	sessionContext(jar as never);
	const mac = jar.values.relex_workspace.split('.')[1];
	const victim = '60000000-0000-4000-8000-000000000001';
	const forged = cookies({ relex_workspace: `${victim}.${mac}` });
	assert.notEqual(sessionContext(forged as never).workspaceId, victim);
});

test('a damaged persistent signing key fails closed on repeated requests', () => {
	const directory = mkdtempSync(join(tmpdir(), 'receipt-bad-key-'));
	writeFileSync(join(directory, '.session-secret'), 'broken', { mode: 0o600 });
	const output = execFileSync(
		process.execPath,
		[
			'--import',
			'tsx',
			'--input-type',
			'module',
			'-e',
			`
  const {sessionContext}=await import('./src/lib/server/session.ts');
  let failures=0;
  for(let i=0;i<2;i++)try{sessionContext({get:()=>undefined,set:()=>{}});}catch{failures++;}
  process.stdout.write(String(failures));
 `
		],
		{ env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8' }
	);
	assert.equal(output, '2');
});
