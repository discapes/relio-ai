import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Cookies } from '@sveltejs/kit';
import { context, resolvePersona } from './memory';
import type { Level } from '../types';

const browserId =
	/^(?:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|demo_[a-f0-9]{32})$/;
let secret: Buffer | undefined;
function sessionSecret() {
	if (secret) return secret;
	const directory = resolve(process.env.DATA_DIR || 'data');
	mkdirSync(directory, { recursive: true, mode: 0o700 });
	const path = resolve(directory, '.session-secret');
	let key: Buffer;
	try {
		key = readFileSync(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		const temporary = resolve(directory, `.session-secret-${randomUUID()}`);
		writeFileSync(temporary, randomBytes(32), { flag: 'wx', mode: 0o600 });
		try {
			linkSync(temporary, path);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
		} finally {
			unlinkSync(temporary);
		}
		key = readFileSync(path);
	}
	if (key.length !== 32)
		throw new Error('Session signing key is unavailable. Restore the persistent session key.');
	secret = key;
	return secret;
}
const signature = (id: string) =>
	createHmac('sha256', sessionSecret()).update(id).digest('base64url');
const settings = () => ({
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.ORIGIN?.startsWith('https://') === true,
	maxAge: 60 * 60 * 24 * 30
});
export function setWorkspaceCookie(cookies: Cookies, id: string) {
	if (!browserId.test(id)) throw new Error('Browser workspace identifier is invalid.');
	cookies.set('relex_workspace', `${id}.${signature(id)}`, settings());
}
function verifiedId(token: string | undefined): string | undefined {
	if (!token) return;
	const [id, mac, extra] = token.split('.');
	if (extra || !browserId.test(id) || !mac) return;
	const expected = Buffer.from(signature(id));
	const supplied = Buffer.from(mac);
	if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return id;
}
export function sessionContext(cookies: Cookies) {
	const token = cookies.get('relex_workspace');
	let id = verifiedId(token);
	if (!id) {
		id = randomUUID();
		setWorkspaceCookie(cookies, id);
		if (token) cookies.set('relex_session_notice', 'upgraded', settings());
	}
	const persona = cookies.get('relex_persona') || 'ana';
	const raw = cookies.get('relex_level');
	const selected = resolvePersona(persona);
	if (!selected) return context(id, 'other', 1);
	const requested = raw ? Number(raw) : selected.level;
	const level = ([1, 2, 3].includes(requested) ? Math.min(requested, selected.level) : 1) as Level;
	return context(id, selected.id, level);
}
