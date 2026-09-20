import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { Source } from '../src/lib/types';

const directory = mkdtempSync(resolve(tmpdir(), 'receipt-privacy-'));
process.env.DATA_DIR = directory;
process.env.DISABLE_BACKGROUND = '1';
const memory = await import('../src/lib/server/memory');
const workflows = await import('../src/lib/server/workflows');
const originalFetch = globalThis.fetch;
function record(id: string, text: string, level: 1 | 2 | 3): Source {
	return {
		id,
		documentId: id,
		title: 'Privacy test evidence',
		type: 'email_thread',
		date: '2026-07-06',
		author: 'Lena Fischer',
		text,
		level,
		position: 'Message 1',
		participants: ['Lena Fischer']
	};
}
function modelResponse(value: unknown) {
	return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
}
function prompt(init?: RequestInit) {
	return JSON.parse(String(init?.body))
		.messages.map((m: { content: string }) => m.content)
		.join('\n');
}

test('customer sharing excludes private memory and internal evidence before both model calls', async () => {
	const ctx = memory.context('share-boundary', 'ana');
	memory.addSource(
		ctx,
		record('canary-public', 'PUBLIC-GREEN-782 is approved for the customer.', 1)
	);
	memory.addSource(
		ctx,
		record('canary-internal', 'INTERNAL-AMBER-324 is a private commercial draft.', 2)
	);
	memory.addSource(
		ctx,
		record('canary-restricted', 'RESTRICTED-VIOLET-965 is an internal stakeholder assessment.', 3)
	);
	workflows.savePreference(ctx, 'PRIVATE-OWNER-418 follow the commercial strategy.');
	const seen: string[] = [];
	globalThis.fetch = async (_url, init) => {
		seen.push(prompt(init));
		return modelResponse({
			text: 'PUBLIC-GREEN-782 is approved. [1]',
			statements: [{ text: 'PUBLIC-GREEN-782 is approved.', sourceIds: ['canary-public'] }],
			citations: [
				{ sourceId: 'canary-public', quote: 'PUBLIC-GREEN-782 is approved for the customer.' }
			],
			trace: ['Checked the public source.']
		});
	};
	try {
		const shared = await workflows.answerQuestion(
			memory.context('share-boundary', 'ana', 1),
			'Which public reference is approved?',
			'share'
		);
		assert.equal(shared.level, 1);
		assert.ok(shared.citations.length);
		assert.equal(seen.length, 2);
		for (const input of seen) {
			assert.ok(input.includes('PUBLIC-GREEN-782'));
			assert.ok(!input.includes('INTERNAL-AMBER-324'));
			assert.ok(!input.includes('RESTRICTED-VIOLET-965'));
			assert.ok(!input.includes('PRIVATE-OWNER-418'));
		}
		const marco = workflows.workspaceData(memory.context('share-boundary', 'marco'));
		assert.equal(marco.preferences.length, 0);
		assert.equal(marco.chat.length, 0);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('adding the agent midway delivers only the new message, with an external audience context', async () => {
	const ctx = memory.context('thread-boundary', 'ana');
	workflows.savePreference(ctx, 'PRIVATE-EMAIL-489 focus on staffing.');
	memory.addSource(
		ctx,
		record('email-restricted', 'INTERNAL-EMAIL-663 restricted staffing assumption.', 3)
	);
	const first = workflows.sendMail(ctx, {
		id: 'undelivered-mail',
		subject: 'A private thread',
		to: ['lena.fischer@acme-org.example'],
		cc: [],
		body: 'UNDISCLOSED-HISTORY-531 is only in the employee mailbox.'
	});
	const delivered = workflows.sendMail(ctx, {
		id: 'delivered-mail',
		threadId: first.threadId,
		subject: first.subject,
		to: ['lena.fischer@acme-org.example'],
		cc: [workflows.AGENT_EMAIL],
		body: 'DELIVERED-UPDATE-837 is the new shared update.'
	});
	let seen = '';
	globalThis.fetch = async (_url, init) => {
		seen = prompt(init);
		return modelResponse({
			participate: false,
			text: '',
			citations: [],
			trace: ['Routine update received.'],
			meeting: null
		});
	};
	try {
		await workflows.processMail(ctx, delivered.id);
		assert.ok(seen.includes('DELIVERED-UPDATE-837'));
		assert.ok(!seen.includes('UNDISCLOSED-HISTORY-531'));
		assert.ok(!seen.includes('PRIVATE-EMAIL-489'));
		assert.ok(!seen.includes('INTERNAL-EMAIL-663'));
		assert.equal(
			memory.getSource(memory.context('thread-boundary', 'nadia'), 'runtime/delivered-mail')?.level,
			1
		);
		assert.ok(!memory.sources(ctx).some((s) => s.text.includes('UNDISCLOSED-HISTORY-531')));
		const before = memory.sources(ctx).length;
		await workflows.processMail(ctx, delivered.id);
		assert.equal(memory.sources(ctx).length, before);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('an in-flight answer cannot publish after erasure changes the memory epoch', async () => {
	const ctx = memory.context('in-flight-erasure', 'ana');
	const source = memory.sources(ctx).find((s) => s.author === 'Kwame Boateng');
	assert.ok(source);
	let signalStarted!: () => void;
	const started = new Promise<void>((resolve) => (signalStarted = resolve));
	let release!: () => void;
	const released = new Promise<void>((resolve) => (release = resolve));
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		if (calls === 1) {
			signalStarted();
			await released;
		}
		return modelResponse({
			action: 'question',
			text: 'Kwame Boateng supplied this update. [1]',
			statements: [{ text: 'Kwame Boateng supplied this update.', sourceIds: [source.id] }],
			citations: [{ sourceId: source.id, quote: source.text }],
			trace: []
		});
	};
	try {
		const pending = workflows.answerQuestion(ctx, 'Who supplied the technical update?');
		await started;
		workflows.erase(ctx, 'kwame-boateng');
		release();
		await assert.rejects(pending, /changed|erased|unavailable/i);
		const clean = workflows.workspaceData(memory.context('in-flight-erasure', 'ana'));
		assert.equal(clean.chat.length, 0);
		assert.ok(!/kwame|boateng/i.test(JSON.stringify(clean.sources)));
		assert.ok(!/kwame|boateng/i.test(JSON.stringify(clean.receipts)));
	} finally {
		release();
		globalThis.fetch = originalFetch;
	}
});

test('recipient floor handles unknown internal and external recipients conservatively', () => {
	const ctx = memory.context('recipient-floor', 'ana');
	const external = workflows.sendMail(ctx, {
		subject: 'External',
		to: ['new.customer@external.example'],
		cc: [workflows.AGENT_EMAIL],
		body: 'A new update.'
	});
	const unknown = workflows.sendMail(ctx, {
		subject: 'Unknown internal',
		to: ['unmapped@relexsolutions.example'],
		cc: [workflows.AGENT_EMAIL],
		body: 'A new update.'
	});
	const known = workflows.sendMail(ctx, {
		subject: 'Internal',
		to: ['marco.rossi@relexsolutions.example'],
		cc: [workflows.AGENT_EMAIL],
		body: 'A new update.'
	});
	assert.equal(external.level, 1);
	assert.equal(unknown.level, 1);
	assert.equal(known.level, 2);
	assert.equal(
		memory.getSource(memory.context('recipient-floor', 'other'), memory.sources(ctx)[0].id),
		undefined
	);
});

test.after(() => {
	globalThis.fetch = originalFetch;
	rmSync(directory, { recursive: true, force: true });
});

test('uncited factual drafts go through verification and unsupported paragraphs cannot publish', async () => {
	const ctx = memory.context('uncited-draft', 'ana');
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		return modelResponse({
			action: 'question',
			text: 'The project budget is exactly 900 million.',
			citations: [],
			statements: [{ text: 'The project budget is exactly 900 million.', sourceIds: [] }]
		});
	};
	try {
		await assert.rejects(
			() => workflows.answerQuestion(ctx, 'What is the project budget?'),
			/incomplete structured output/
		);
		assert.equal(calls, 4);
		assert.equal(workflows.workspaceData(ctx).chat.length, 0);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('failed email inference preserves ingestion and retry delivers one result', async () => {
	const ctx = memory.context('mail-recovery', 'ana');
	const mail = workflows.sendMail(ctx, {
		id: 'recoverable',
		subject: 'A schedule update',
		to: ['lena.fischer@acme-org.example'],
		cc: [workflows.AGENT_EMAIL],
		body: 'The next review is Thursday.'
	});
	globalThis.fetch = async () => new Response('unavailable', { status: 503 });
	try {
		await assert.rejects(() => workflows.processMail(ctx, mail.id), /503/);
		assert.ok(memory.getSource(ctx, 'runtime/recoverable'));
		assert.equal(
			workflows.workspaceData(ctx).mails.find((m) => m.id === mail.id)?.status,
			'Processing failed'
		);
		globalThis.fetch = async () => modelResponse({ participate: false, text: '', citations: [] });
		await workflows.processMail(ctx, mail.id);
		await workflows.processMail(ctx, mail.id);
		assert.equal(workflows.workspaceData(ctx).mails.filter((m) => m.id === mail.id).length, 1);
		assert.equal(
			workflows.workspaceData(ctx).mails.find((m) => m.id === mail.id)?.status,
			'Memory updated'
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('erasure during email inference prevents stale reply and calendar publication', async () => {
	const ctx = memory.context('mail-erasure', 'ana');
	const mail = workflows.sendMail(ctx, {
		id: 'inflight-mail',
		subject: 'A technical review',
		to: [workflows.AGENT_EMAIL],
		cc: ['lena.fischer@acme-org.example'],
		body: 'Kwame Boateng will join the review.'
	});
	let started!: () => void, release!: () => void;
	const waiting = new Promise<void>((resolve) => (started = resolve));
	const resume = new Promise<void>((resolve) => (release = resolve));
	globalThis.fetch = async () => {
		started();
		await resume;
		return modelResponse({
			participate: true,
			text: 'Kwame Boateng will attend.',
			citations: [],
			meeting: { title: 'Kwame review', date: '2026-07-09T10:00:00+03:00' }
		});
	};
	try {
		const pending = workflows.processMail(ctx, mail.id);
		await waiting;
		workflows.erase(ctx, 'kwame-boateng');
		release();
		await assert.rejects(pending, /changed|erased|unavailable/i);
		const data = workflows.workspaceData(memory.context(ctx.workspaceId, 'ana'));
		assert.ok(!data.mails.some((m) => m.id === mail.id || m.id === `reply-${mail.id}`));
		assert.ok(!/kwame|boateng/i.test(JSON.stringify(data.meetings)));
	} finally {
		release();
		globalThis.fetch = originalFetch;
	}
});

test('natural personal goals use private request context without loading project evidence', async () => {
	const ctx = memory.context('goal-intent', 'ana');
	let calls = 0;
	let input = '';
	globalThis.fetch = async (_url, init) => {
		calls++;
		input = prompt(init);
		return modelResponse({
			action: 'remember',
			text: 'Follow bakery integration and customer decisions.',
			needsEvidence: false,
			research: 'standard'
		});
	};
	try {
		const answer = await workflows.answerQuestion(ctx, 'Pidä bakeryn eteneminen mun briiffissä.');
		assert.equal(calls, 1);
		assert.ok(!input.includes('Permitted evidence records'));
		assert.equal(answer.citations.length, 0);
		assert.equal(workflows.preferences(ctx).length, 1);
		assert.equal(workflows.preferences(memory.context(ctx.workspaceId, 'marco')).length, 0);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('meeting preparation receives the simulated event and permitted private goals', async () => {
	const ctx = memory.context('meeting-preparation', 'ana');
	workflows.savePreference(ctx, 'Prioritise bakery decisions.');
	const source = memory.sources(ctx)[0];
	let input = '';
	globalThis.fetch = async (_url, init) => {
		input += prompt(init);
		return modelResponse({
			text: 'Recommendation: review the cited project update.',
			citations: [{ sourceId: source.id, quote: source.text }],
			statements: [
				{ text: 'Recommendation: review the cited project update.', sourceIds: [source.id] }
			]
		});
	};
	try {
		const answer = await workflows.generateBrief(ctx, 'bakery');
		assert.equal(answer.kind, 'meeting');
		assert.ok(input.includes('2026-07-08T10:00:00+03:00'));
		assert.ok(input.includes('simulated meeting'));
		assert.ok(input.includes('Prioritise bakery decisions.'));
		assert.equal(answer.citations[0].sourceId, source.id);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
