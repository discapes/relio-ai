import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'relex-memory-'));
const memory = await import('../src/lib/server/memory');
const {
	context,
	sources,
	claims,
	people,
	getSource,
	addSource,
	erasePerson,
	epoch,
	ensureWorkspace,
	db,
	replaceClaims,
	resetWorkspace,
	registerErasureHook,
	isSuppressed
} = memory;
import type { Source } from '../src/lib/types';
const source = (id: string, text: string, level: 1 | 2 | 3 = 1): Source => ({
	id,
	documentId: id,
	title: 'New project message',
	type: 'email_thread',
	date: '2026-09-20',
	author: 'Lena Fischer',
	text,
	level,
	position: 'Message 1',
	participants: ['Lena Fischer']
});

test('all parsed records import with original IDs, ordinal positions and exact body text', () => {
	const ctx = context('coverage', 'ana');
	const rows = sources(ctx);
	assert.equal(rows.length, 2974);
	assert.equal(new Set(rows.map((s) => s.documentId)).size, 45);
	assert.equal(rows.filter((s) => s.type === 'email_thread').length, 110);
	assert.equal(rows.filter((s) => s.type === 'report_thread').length, 25);
	assert.equal(rows.filter((s) => s.type === 'meeting_transcript').length, 2839);
	const timed = rows.find(
		(s) => s.id === 'transcripts/21_2026-04-09_data-protection-review#utterance-0006'
	)!;
	assert.equal(timed.text, 'Your environment is hosted in the EU. West Europe region.');
	assert.equal(timed.position, '0:33 · utterance 6');
	assert.ok(rows.some((s) => s.position.includes('speaker attribution unresolved')));
	assert.equal(new Set(people(ctx).map((p) => p.id)).size, people(ctx).length);
	assert.equal(people(ctx).filter((p) => p.name.startsWith('Henrik')).length, 1);
	assert.ok(!people(ctx).some((p) => p.name === 'Unknown Speaker' || p.name === 'Guest 1'));
});

test('scope applies to record, claim, person and direct source retrieval', () => {
	const all = context('scope', 'ana');
	for (const level of [1, 2, 3] as const)
		addSource(all, source(`level-${level}`, `Visible at level ${level}`, level));
	const customer = context('scope', 'nadia');
	const internal = context('scope', 'marco');
	const foreign = context('scope', 'other');
	assert.ok(sources(customer).every((s) => s.level === 1));
	assert.ok(sources(internal).every((s) => s.level <= 2));
	assert.equal(getSource(customer, 'level-2'), undefined);
	assert.equal(getSource(internal, 'level-3'), undefined);
	assert.deepEqual(sources(foreign), []);
	assert.deepEqual(people(foreign), []);
	assert.deepEqual(claims(foreign), []);
	assert.throws(() => context('scope', 'nadia', 3));
	assert.throws(() => context('scope', 'invented'));
	assert.throws(() => addSource(customer, source('bad', 'Hidden', 2)));
	assert.throws(() =>
		replaceClaims(all, [
			{
				id: 'claim',
				text: 'Hidden',
				kind: 'decision',
				status: 'current',
				sourceIds: ['level-3'],
				level: 1
			}
		])
	);
	replaceClaims(all, [
		{
			id: 'claim',
			text: 'Restricted detail',
			kind: 'decision',
			status: 'current',
			sourceIds: ['level-3'],
			level: 3
		}
	]);
	assert.equal(claims(all).length, 1);
	assert.equal(claims(customer).length, 0);
	const mixed = sources(all).filter((s) => s.documentId === 'emails/15_uat-signoff');
	assert.ok(mixed.length > 0);
	assert.ok(mixed.every((s) => s.level === 1 || s.level === 2));
});

test('erasure removes authored evidence, aliases and metadata while preserving other named evidence', () => {
	const ctx = context('erase', 'ana');
	addSource(
		ctx,
		source(
			'mixed',
			'Kwame suggested an old draft.\n\nLena Fischer approved the updated pilot scope.'
		)
	);
	addSource(ctx, source('survives', 'Priya Nair owns the integration.'));
	addSource(
		ctx,
		source(
			'same-paragraph',
			'Kwame wrote the draft. He added a personal note. Lena Fischer approved the pilot scope.'
		)
	);
	replaceClaims(ctx, [
		{
			id: 'stale',
			text: 'An old interpretation',
			kind: 'decision',
			status: 'current',
			sourceIds: ['mixed'],
			level: 3
		}
	]);
	db().exec('CREATE TABLE IF NOT EXISTS test_artifacts(workspace_id TEXT,payload TEXT)');
	db()
		.prepare('INSERT INTO test_artifacts VALUES (?,?)')
		.run(ctx.workspaceId, 'Kwame private note');
	registerErasureHook((workspaceId) =>
		Number(db().prepare('DELETE FROM test_artifacts WHERE workspace_id=?').run(workspaceId).changes)
	);
	const receipt = erasePerson(ctx, 'kwame-boateng');
	assert.ok(receipt.sourcesRemoved > 0);
	assert.equal(receipt.artifactsRemoved, 2);
	assert.equal(epoch(ctx.workspaceId), 1);
	assert.deepEqual(sources(ctx), []);
	assert.throws(() => addSource(ctx, source('late', 'Old generation')));
	const clean = context(ctx.workspaceId, 'ana');
	const surviving = sources(clean);
	assert.ok(!/kwame|boateng/i.test(JSON.stringify(surviving)));
	assert.equal(getSource(clean, 'mixed')?.text, 'Lena Fischer approved the updated pilot scope.');
	assert.equal(getSource(clean, 'survives')?.text, 'Priya Nair owns the integration.');
	assert.equal(getSource(clean, 'same-paragraph')?.text, 'Lena Fischer approved the pilot scope.');
	assert.ok(people(clean).some((p) => p.name === 'Lena Fischer'));
	assert.ok(!people(clean).some((p) => p.name.includes('Kwame')));
	assert.equal(claims(clean).length, 0);
	assert.equal(
		db()
			.prepare('SELECT COUNT(*) AS n FROM test_artifacts WHERE workspace_id=?')
			.get(ctx.workspaceId)?.n,
		0
	);
	assert.equal(isSuppressed(ctx.workspaceId, 'A new message mentioning Kwame.'), true);
	assert.throws(() => addSource(clean, source('resurrect', 'Kwame agreed.')));
	assert.ok(!/kwame|boateng/i.test(JSON.stringify(memory.erasedReceipts(clean))));
	ensureWorkspace(ctx.workspaceId);
	assert.ok(!/kwame|boateng/i.test(JSON.stringify(sources(context(ctx.workspaceId, 'ana')))));
	assert.throws(() => erasePerson(context('erase', 'marco'), 'lena-fischer'));
});

test('erasing another stakeholder matches exact aliases and reset creates an isolated workspace', () => {
	const ctx = context('second', 'ana');
	addSource(ctx, source('nearby', 'Priyanka Rao handles resourcing.', 3));
	erasePerson(ctx, 'priya-nair');
	const clean = context('second', 'ana');
	assert.equal(getSource(clean, 'nearby')?.text, 'Priyanka Rao handles resourcing.');
	assert.ok(!people(clean).some((p) => p.id === 'priya-nair'));
	const fresh = resetWorkspace('second');
	assert.notEqual(fresh, 'second');
	assert.ok(people(context(fresh, 'ana')).some((p) => p.id === 'priya-nair'));
	assert.ok(!people(context('second', 'ana')).some((p) => p.id === 'priya-nair'));
});

test('deleting a selectable employee redacts identity in context and demo selector', () => {
	const ctx = context('own-identity', 'ana');
	erasePerson(ctx, 'ana-duarte');
	const clean = context('own-identity', 'ana');
	assert.equal(clean.persona.name, 'Project member 1');
	assert.equal(clean.persona.id, 'p1');
	assert.equal(clean.persona.role, 'Project member');
	assert.equal(memory.resolvePersona('ana')?.id, 'p1');
	assert.equal(memory.resolvePersona('p1')?.id, 'p1');
	assert.ok(memory.visiblePersonas(clean).every((p) => /^p[1-4]$/.test(p.id)));
	assert.ok(!/ana duarte|ana\.duarte/i.test(JSON.stringify(memory.visiblePersonas(clean))));
});

test('erasure follows nearby pronouns and unique signed roles while retaining another named person', () => {
	const ctx = context('coreference', 'ana');
	const records: Source[] = [
		{
			...source('coreference#utterance-001', 'Sofia Almeida is away for treatment.'),
			documentId: 'coreference',
			type: 'meeting_transcript',
			author: 'Ana Duarte'
		},
		{
			...source('coreference#utterance-002', 'She had surgery and needs six weeks to recover.'),
			documentId: 'coreference',
			type: 'meeting_transcript',
			author: 'Unknown Speaker'
		},
		{
			...source('coreference#utterance-003', 'Priya Nair will own the interface review.'),
			documentId: 'coreference',
			type: 'meeting_transcript',
			author: 'Ana Duarte'
		},
		{
			...source('coreference#utterance-004', 'She has booked the review for Friday.'),
			documentId: 'coreference',
			type: 'meeting_transcript',
			author: 'Ana Duarte'
		},
		{
			...source(
				'role-reference',
				'The fresh category manager has sole responsibility and is recovering from treatment.'
			),
			author: 'Ana Duarte'
		}
	];
	for (const record of records) addSource(ctx, record);
	erasePerson(ctx, 'sofia-almeida');
	const clean = context('coreference', 'ana');
	assert.equal(getSource(clean, 'coreference#utterance-001'), undefined);
	assert.equal(getSource(clean, 'coreference#utterance-002'), undefined);
	assert.equal(getSource(clean, 'role-reference'), undefined);
	assert.equal(
		getSource(clean, 'coreference#utterance-003')?.text,
		'Priya Nair will own the interface review.'
	);
	assert.equal(
		getSource(clean, 'coreference#utterance-004')?.text,
		'She has booked the review for Friday.'
	);
});

test('shared first names stay distinct and deletion preserves the other full identity', () => {
	const ctx = context('same-first', 'ana');
	const identities = people(ctx).filter((p) => p.name.startsWith('Nadia '));
	assert.ok(identities.some((p) => p.name === 'Nadia Haddad'));
	assert.ok(identities.some((p) => p.name === 'Nadia Öberg'));
	assert.ok(identities.every((p) => !p.aliases.includes('Nadia')));
	addSource(ctx, {
		...source('nadia-other', 'Nadia Öberg approved the separate training plan.', 3),
		author: 'Nadia Öberg',
		participants: ['Nadia Öberg']
	});
	erasePerson(ctx, 'nadia-haddad');
	assert.equal(
		getSource(context('same-first', 'ana'), 'nadia-other')?.text,
		'Nadia Öberg approved the separate training plan.'
	);
});

test('erasing an identified store employee preserves other rows in the same source table', () => {
	const ctx = context('operator-table', 'ana');
	erasePerson(ctx, 'marika-lindqvist');
	const clean = context('operator-table', 'ana');
	const record = getSource(clean, 'emails/07_op-id-field-exclusion#message-004');
	assert.ok(record?.text.includes('448933  Osman Yildirim'));
	assert.ok(record?.text.includes('451207  Heidi Salminen'));
	assert.ok(!JSON.stringify(sources(clean)).includes('447102'));
	assert.ok(!/marika|lindqvist/i.test(JSON.stringify(sources(clean))));
	assert.ok(people(clean).some((p) => p.name === 'Heidi Salminen'));
	assert.throws(() =>
		addSource(clean, source('operator-again', 'Operator 447102 has another record.'))
	);
});

test('surname-only references are erased with the supported identity', () => {
	const ctx = context('surname-reference', 'ana');
	addSource(ctx, source('surname-note', 'Kahn requested the revised budget.', 3));
	erasePerson(ctx, 'robert-kahn');
	const clean = context('surname-reference', 'ana');
	assert.equal(getSource(clean, 'surname-note'), undefined);
	assert.ok(!/\bkahn\b/i.test(JSON.stringify(sources(clean))));
	assert.ok(people(clean).some((p) => p.name === 'Lena Fischer'));
});

test('name-link metadata contains only permitted and surviving people', () => {
	const ctx = context('name-link-scope', 'ana');
	addSource(ctx, {
		...source('restricted-identity', 'Zelda Restricted owns this note.', 3),
		author: 'Zelda Restricted',
		participants: ['Zelda Restricted']
	});
	assert.ok(people(ctx).some((p) => p.name === 'Zelda Restricted'));
	assert.ok(
		!people(context('name-link-scope', 'nadia')).some((p) =>
			p.aliases.some((a) => a.includes('Zelda'))
		)
	);
	const zelda = people(ctx).find((p) => p.name === 'Zelda Restricted')!;
	erasePerson(ctx, zelda.id);
	assert.ok(!people(ctx).some((p) => p.aliases.some((a) => a.includes('Zelda'))));
});
