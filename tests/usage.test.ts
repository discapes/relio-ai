import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	browserUsageEvents,
	createUsageWriter,
	requestUsageKind,
	usageInput,
	usageLocation,
	observeUsage,
	recordUsageInput
} from '../src/lib/server/usage';

test('usage writer is optional and disk failures stay contained', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'relio-usage-'));
	try {
		const disabled = createUsageWriter({ directory, enabled: () => false });
		disabled.write({ event: 'action.ask' });
		await disabled.flush();
		assert.deepEqual(await readdir(directory), []);
		let writes = 0;
		const broken = createUsageWriter({
			directory,
			append: (async () => {
				writes++;
				throw new Error('disk full');
			}) as never
		});
		broken.write({ event: 'action.ask' });
		await assert.doesNotReject(broken.flush());
		assert.equal(writes, 1);
		assert.equal(
			observeUsage({}, () => {
				recordUsageInput({ question: 'Hello' });
				return 'normal response';
			}),
			'normal response'
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test('usage buffering and rotation keep a bounded history', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'relio-usage-'));
	try {
		const writer = createUsageWriter({ directory, maxBytes: 100, files: 2 });
		writer.write({ event: 'first', text: 'a'.repeat(70) });
		await writer.flush();
		writer.write({ event: 'second', text: 'b'.repeat(70) });
		await writer.flush();
		writer.write({ event: 'third', text: 'c'.repeat(70) });
		await writer.flush();
		assert.equal((await readdir(directory)).length, 2);
		assert.match(await readFile(join(directory, 'events.ndjson'), 'utf8'), /third/);
		assert.match(await readFile(join(directory, 'events.ndjson.1'), 'utf8'), /second/);
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		assert.doesNotThrow(() => writer.write(cycle));
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test('request observations exclude automatic loads and identify meaningful actions', () => {
	const classify = (path: string, method = 'GET', headers: Record<string, string> = {}) =>
		requestUsageKind(
			new Request('https://relio-ai.eu' + path, { method, headers }),
			new URL('https://relio-ai.eu' + path)
		);
	for (const path of [
		'/state',
		'/search?q=hello',
		'/__data.json?view=people',
		'/usage',
		'/favicon.png'
	])
		assert.equal(classify(path), undefined);
	assert.equal(classify('/?view=people', 'GET', { accept: 'text/html' }), 'page.open');
	assert.equal(
		classify('/?view=people', 'GET', { accept: 'text/html', purpose: 'prefetch' }),
		undefined
	);
	assert.equal(classify('/?/sendMail', 'POST'), 'action.sendMail');
	assert.equal(classify('/chat/stream', 'POST'), 'question.request');
});

test('only bounded deliberate input and event fields are accepted', () => {
	assert.deepEqual(
		usageInput({
			question: 'Hi',
			authorization: 'secret',
			cookie: 'secret',
			context: { secret: 'x' }
		}),
		{ question: 'Hi' }
	);
	assert.equal(String(usageInput({ body: 'a'.repeat(20000) }).body).length, 8000);
	assert.equal(
		usageLocation('/?view=people&token=secret&person=lena#profile'),
		'/?view=people&person=lena#profile'
	);
	const events = browserUsageEvents(
		Array.from({ length: 30 }, () => ({
			kind: 'click',
			label: 'x'.repeat(500),
			authorization: 'secret',
			href: '/?view=people&token=secret'
		}))
	);
	assert.equal(events.length, 20);
	assert.equal(String(events[0].label).length, 200);
	assert.equal(events[0].authorization, undefined);
	assert.equal(events[0].href, '/?view=people');
	assert.deepEqual(browserUsageEvents([{ kind: 'server.tokens', message: 'noise' }]), []);
});

test('production logging requires a request scope and ignores standalone workflow calls', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'relio-usage-scope-'));
	try {
		const result = spawnSync(
			process.execPath,
			[
				'--import',
				'tsx',
				'--input-type=module',
				'-e',
				`
			import { recordUsage, observeUsage } from './src/lib/server/usage.ts';
			recordUsage('question.completed', { source: 'unit-test-without-request' });
			observeUsage({ requestId: 'isolated-request', automation: true }, () => recordUsage('page.open'));
			await new Promise(resolve => setTimeout(resolve, 1300));
		`
			],
			{ env: { ...process.env, USAGE_LOGGING: '1', USAGE_LOG_DIR: directory }, encoding: 'utf8' }
		);
		assert.equal(result.status, 0, result.stderr);
		const events = (await readFile(join(directory, 'events.ndjson'), 'utf8'))
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		assert.equal(events.length, 1);
		assert.equal(events[0].event, 'page.open');
		assert.equal(events[0].requestId, 'isolated-request');
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test('usage reports omit legacy unscoped test rows and writer metadata', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'relio-usage-report-'));
	try {
		await writeFile(
			join(directory, 'events.ndjson'),
			[
				{ at: '2026-09-20T10:00:00Z', event: 'question.completed' },
				{ at: '2026-09-20T10:00:01Z', event: 'analytics.dropped', count: 2 },
				{ at: '2026-09-20T10:00:02Z', event: 'page.open', requestId: 'actual-request', path: '/' }
			]
				.map((event) => JSON.stringify(event))
				.join('\n') + '\n'
		);
		const result = spawnSync(process.execPath, ['scripts/usage-report.mjs', '--dir', directory], {
			encoding: 'utf8'
		});
		assert.equal(result.status, 0, result.stderr);
		const report = JSON.parse(result.stdout);
		assert.equal(report.events, 1);
		assert.deepEqual(report.eventCounts, { 'page.open': 1 });
		assert.equal(
			(await readFile(join(directory, 'events.ndjson'), 'utf8')).trim().split('\n').length,
			3
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
