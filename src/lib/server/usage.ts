import { AsyncLocalStorage } from 'node:async_hooks';
import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export type UsageRecord = Record<string, unknown>;
const scope = new AsyncLocalStorage<UsageRecord>();
export const usageEnabled = () => process.env.USAGE_LOGGING !== '0';
const text = (value: unknown, limit = 500) =>
	typeof value === 'string' ? value.slice(0, limit) : undefined;
const fields = new Set([
	'question',
	'meetingId',
	'text',
	'id',
	'personId',
	'personaId',
	'level',
	'eventId',
	'threadId',
	'subject',
	'to',
	'cc',
	'body'
]);
export function usageInput(input: Record<string, unknown> | FormData) {
	const result: UsageRecord = {};
	for (const key of fields) {
		const value = input instanceof FormData ? input.get(key) : input[key];
		if (typeof value === 'string' || typeof value === 'number')
			result[key] = String(value).slice(0, ['body', 'question', 'text'].includes(key) ? 8000 : 500);
	}
	return result;
}
export function usageLocation(value: string, origin = 'https://relio-ai.eu') {
	try {
		const url = new URL(value, origin);
		const query = new URLSearchParams();
		for (const key of ['view', 'tab', 'person', 'claim', 'mail', 'q', 'offset']) {
			const value = url.searchParams.get(key);
			if (value) query.set(key, value.slice(0, 500));
		}
		return `${url.origin === origin ? '' : url.origin}${url.pathname.slice(0, 500)}${query.size ? '?' + query : ''}${url.hash.slice(0, 200)}`;
	} catch {
		return undefined;
	}
}

// Disk work never runs in the request path. A full queue drops analytics.
export function createUsageWriter(options: {
	directory: string;
	enabled?: () => boolean;
	maxBytes?: number;
	files?: number;
	append?: typeof appendFile;
}) {
	let queue: string[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	let writing: Promise<void> | undefined;
	let dropped = 0;
	const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
	const files = options.files ?? 7;
	const path = resolve(options.directory, 'events.ndjson');
	async function flush() {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (writing) {
			await writing;
			if (queue.length) await flush();
			return;
		}
		if (!queue.length) return;
		const lines = queue;
		queue = [];
		if (dropped) {
			lines.push(
				JSON.stringify({
					at: new Date().toISOString(),
					event: 'analytics.dropped',
					count: dropped
				}) + '\n'
			);
			dropped = 0;
		}
		writing = (async () => {
			try {
				await mkdir(options.directory, { recursive: true, mode: 0o700 });
				const size = await stat(path)
					.then((s) => s.size)
					.catch(() => 0);
				if (size + Buffer.byteLength(lines.join('')) > maxBytes) {
					await rm(`${path}.${files - 1}`, { force: true });
					for (let i = files - 2; i >= 1; i--)
						await rename(`${path}.${i}`, `${path}.${i + 1}`).catch(() => {});
					await rename(path, `${path}.1`).catch(() => {});
				}
				await (options.append ?? appendFile)(path, lines.join(''), { mode: 0o600 });
			} catch {
				/* Analytics loss must never affect the demo. */
			}
		})();
		await writing;
		writing = undefined;
	}
	return {
		write(record: UsageRecord) {
			try {
				if (options.enabled && !options.enabled()) return;
				if (queue.length >= 200) {
					dropped++;
					return;
				}
				const line = JSON.stringify(record) + '\n';
				if (Buffer.byteLength(line) > 32 * 1024) {
					dropped++;
					return;
				}
				queue.push(line);
				if (!timer) {
					timer = setTimeout(() => {
						void flush();
					}, 1000);
					timer.unref();
				}
			} catch {
				/* Includes malformed or circular observer data. */
			}
		},
		flush
	};
}
const writer = createUsageWriter({
	directory: resolve(process.env.USAGE_LOG_DIR || resolve(process.env.DATA_DIR || 'data', 'usage')),
	enabled: usageEnabled
});
export function recordUsage(event: string, details: UsageRecord = {}) {
	try {
		const context = scope.getStore();
		if (usageEnabled() && context)
			writer.write({ ...context, ...details, at: new Date().toISOString(), event });
	} catch {
		/* Observer only. */
	}
}
export function usageContext(context: {
	workspaceId: string;
	persona: { id: string };
	level: number;
}) {
	const current = scope.getStore();
	if (current)
		Object.assign(current, {
			workspaceId: context.workspaceId,
			personaId: context.persona.id,
			level: context.level
		});
}
export function recordUsageInput(input: Record<string, unknown> | FormData) {
	try {
		const current = scope.getStore();
		if (current) current.input = usageInput(input);
	} catch {
		/* Observer only. */
	}
}
export function observeUsage<T>(metadata: UsageRecord, callback: () => T): T {
	return scope.run(metadata, callback);
}
export function requestUsageMetadata(event: {
	request: Request;
	url: URL;
	cookies: { get(name: string): string | undefined };
	getClientAddress(): string;
}) {
	const token = event.cookies.get('relex_workspace') || '';
	const workspaceId = token.split('.')[0];
	return {
		requestId: randomUUID(),
		cookieWorkspaceId: /^(?:[a-f0-9-]{36}|demo_[a-f0-9]{32})$/.test(workspaceId)
			? workspaceId
			: undefined,
		cookiePersonaId: text(event.cookies.get('relex_persona') || 'ana', 80),
		cookieLevel: text(event.cookies.get('relex_level'), 1),
		forwardedIp: text(event.request.headers.get('x-forwarded-for'), 200),
		peerIp: (() => {
			try {
				return event.getClientAddress();
			} catch {
				return undefined;
			}
		})(),
		userAgent: text(event.request.headers.get('user-agent'), 500),
		referrer: event.request.headers.get('referer')
			? usageLocation(event.request.headers.get('referer')!, event.url.origin)
			: undefined,
		path: usageLocation(event.url.href, event.url.origin),
		automation: /bot|crawler|spider|headless|playwright|curl|python|probe/i.test(
			event.request.headers.get('user-agent') || ''
		)
	};
}
export function requestUsageKind(request: Request, url: URL) {
	if (request.method === 'POST' && ['/', '/session', '/chat/stream'].includes(url.pathname)) {
		const action = [...url.searchParams.keys()].find((k) => k.startsWith('/'))?.slice(1);
		return url.pathname === '/'
			? `action.${action || 'unknown'}`
			: url.pathname === '/session'
				? 'session.change'
				: 'question.request';
	}
	if (
		request.method === 'GET' &&
		(url.pathname === '/' || url.pathname.startsWith('/source/')) &&
		request.headers.get('accept')?.includes('text/html') &&
		!request.headers.get('purpose')?.includes('prefetch') &&
		!request.headers.get('sec-purpose')?.includes('prefetch')
	)
		return 'page.open';
	return undefined;
}
const browserKinds = new Set([
	'navigation',
	'click',
	'toggle',
	'change',
	'submit',
	'visibility',
	'error'
]);
export function browserUsageEvents(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.slice(0, 20).flatMap((raw) => {
		if (!raw || typeof raw !== 'object' || !browserKinds.has(raw.kind)) return [];
		const result: UsageRecord = { kind: raw.kind };
		for (const key of [
			'clientId',
			'tabId',
			'eventId',
			'at',
			'label',
			'target',
			'value',
			'state',
			'message',
			'workspaceId',
			'personaId',
			'level'
		]) {
			if (typeof raw[key] === 'string')
				result[key] = raw[key].slice(0, key === 'message' ? 1000 : 200);
		}
		for (const key of ['path', 'href'])
			if (typeof raw[key] === 'string') result[key] = usageLocation(raw[key]);
		for (const key of ['width', 'height', 'elapsedMs'])
			if (Number.isFinite(raw[key])) result[key] = Math.min(Math.max(raw[key], 0), 86400000);
		return [result];
	});
}
