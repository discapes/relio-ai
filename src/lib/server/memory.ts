import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { database } from './database';
import type { Claim, Context, Level, Person, Persona, Source } from '../types';

export const personas: Persona[] = [
	{
		id: 'p1',
		name: 'Ana Duarte',
		email: 'ana.duarte@relexsolutions.example',
		role: 'Project manager',
		canErase: true,
		level: 3,
		projects: ['acme']
	},
	{
		id: 'p2',
		name: 'Marco Rossi',
		email: 'marco.rossi@relexsolutions.example',
		role: 'Account executive',
		level: 2,
		projects: ['acme']
	},
	{
		id: 'p3',
		name: 'Nadia Haddad',
		email: 'n.haddad@relexsolutions.example',
		role: 'Delivery consultant · customer-shareable view',
		level: 1,
		projects: ['acme']
	},
	{
		id: 'p4',
		name: 'Demo colleague',
		email: 'colleague@relexsolutions.example',
		role: 'Another project',
		level: 3,
		projects: ['other-project']
	}
];
const personaAliases: Record<string, string> = { ana: 'p1', marco: 'p2', nadia: 'p3', other: 'p4' };
export function resolvePersona(id: string): Persona | undefined {
	return personas.find((p) => p.id === (personaAliases[id] ?? id));
}
let initialized = false;
export function db() {
	const connection = database();
	if (!initialized) {
		connection.exec(`
   PRAGMA secure_delete = ON;
   CREATE TABLE IF NOT EXISTS memory_workspaces(id TEXT PRIMARY KEY, epoch INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS memory_sources(workspace_id TEXT NOT NULL,id TEXT NOT NULL,project_id TEXT NOT NULL,level INTEGER NOT NULL,payload TEXT NOT NULL,classification_basis TEXT NOT NULL,PRIMARY KEY(workspace_id,id));
   CREATE TABLE IF NOT EXISTS memory_claims(workspace_id TEXT NOT NULL,id TEXT NOT NULL,project_id TEXT NOT NULL,level INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(workspace_id,id));
   CREATE TABLE IF NOT EXISTS memory_suppression(workspace_id TEXT NOT NULL,token_hash TEXT NOT NULL,PRIMARY KEY(workspace_id,token_hash));
   CREATE TABLE IF NOT EXISTS memory_receipts(workspace_id TEXT NOT NULL,id TEXT NOT NULL,created_at TEXT NOT NULL,sources_removed INTEGER NOT NULL,artifacts_removed INTEGER NOT NULL,PRIMARY KEY(workspace_id,id));
   CREATE INDEX IF NOT EXISTS memory_source_scope ON memory_sources(workspace_id,project_id,level);
  `);
		initialized = true;
	}
	return connection;
}
function transaction<T>(fn: () => T): T {
	db().exec('BEGIN IMMEDIATE');
	try {
		const value = fn();
		db().exec('COMMIT');
		return value;
	} catch (error) {
		db().exec('ROLLBACK');
		throw error;
	}
}
const normalize = (text: string) =>
	text
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replaceAll('ø', 'o')
		.replaceAll('ł', 'l');
const tokens = (text: string) =>
	normalize(text).match(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}|[\p{L}\p{N}]+/gu) ?? [];
const hash = (workspaceId: string, value: string) =>
	createHash('sha256').update(`${workspaceId}\0${value}`).digest('hex');
function matcher(aliases: string[]) {
	const expressions = aliases.map(
		(alias) =>
			new RegExp(
				`(?<![\\p{L}\\p{N}])${normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
				'u'
			)
	);
	return (text: string) => {
		const value = normalize(text);
		return expressions.some((regex) => regex.test(value));
	};
}
function contains(text: string, aliases: string[]) {
	return matcher(aliases)(text);
}
function suppressed(workspaceId: string, text: string) {
	const hashes = new Set(
		db()
			.prepare('SELECT token_hash FROM memory_suppression WHERE workspace_id=?')
			.all(workspaceId)
			.map((r) => String(r.token_hash))
	);
	if (!hashes.size) return false;
	const words = tokens(text);
	for (let i = 0; i < words.length; i++)
		for (let n = 1; n <= Math.min(5, words.length - i); n++) {
			if (hashes.has(hash(workspaceId, words.slice(i, i + n).join(' ')))) return true;
		}
	return false;
}
export function isSuppressed(workspaceId: string, text: string) {
	return suppressed(workspaceId, text);
}
interface Mailbox {
	name: string;
	email: string;
}
interface Document {
	id: string;
	type: string;
	format?: string;
	metadata?: { meeting: string; date: string; attendees: string; phase: string };
	messages?: {
		id: string;
		position: number;
		subject: string;
		from: Mailbox;
		to: Mailbox[];
		cc: Mailbox[];
		date: string;
		body: string;
	}[];
	utterances?: {
		id: string;
		position: number;
		speaker: string;
		timestamp_seconds: number | null;
		text: string;
	}[];
}
function records(): { source: Source; basis: string }[] {
	const root = resolve(process.env.CORPUS_DIR || '../corpus_parsed/acme');
	const result: { source: Source; basis: string }[] = [];
	for (const folder of ['emails', 'reports', 'transcripts'])
		for (const file of readdirSync(resolve(root, folder))
			.filter((f) => f.endsWith('.json'))
			.sort()) {
			const doc = JSON.parse(readFileSync(resolve(root, folder, file), 'utf8')) as Document;
			for (const m of doc.messages ?? []) {
				const recipients = [m.from, ...m.to, ...m.cc];
				const customer = recipients.some((p) => p.email.endsWith('@acme-org.example'));
				const internal = recipients.every((p) => p.email.endsWith('@relexsolutions.example'));
				const restricted =
					internal && /\b(restricted|confidential|power[ -]?map|people partner)\b/i.test(m.subject);
				const level: Level = restricted ? 3 : customer ? 1 : 2;
				result.push({
					source: {
						id: m.id,
						documentId: doc.id,
						title: m.subject,
						type: doc.type,
						date: m.date,
						author: m.from.name,
						text: m.body,
						level,
						position: `Message ${m.position}`,
						participants: recipients.flatMap((p) => [p.name, p.email]).filter(Boolean),
						email: {
							from: m.from.email,
							to: m.to.map((p) => p.email),
							cc: m.cc.map((p) => p.email)
						}
					},
					basis: restricted
						? 'Explicit restricted internal subject'
						: customer
							? 'Customer included in this message audience'
							: internal
								? 'RELEX-only message audience'
								: 'Unresolved external audience; internal review required'
				});
			}
			if (doc.utterances) {
				const meta = doc.metadata!;
				const participants = meta.attendees
					.split(/,\s*(?![^()]*\))/)
					.map((p) => p.replace(/\s*\([^)]*\)/g, '').trim())
					.filter(Boolean);
				const internal = /INTERNAL/i.test(doc.id) || /RELEX only/i.test(meta.phase);
				const restricted = internal && /renewal-resourcing|account-review/.test(doc.id);
				const level: Level = restricted
					? 3
					: internal
						? 2
						: /\(Acme\b/.test(meta.attendees)
							? 1
							: 2;
				for (const u of doc.utterances)
					result.push({
						source: {
							id: u.id,
							documentId: doc.id,
							title: meta.meeting,
							type: doc.type,
							date: meta.date,
							author: u.speaker,
							text: u.text,
							level,
							position:
								u.timestamp_seconds == null
									? `Turn ${u.position} · speaker attribution unresolved`
									: `${Math.floor(u.timestamp_seconds / 60)}:${String(u.timestamp_seconds % 60).padStart(2, '0')} · utterance ${u.position}`,
							participants
						},
						basis: restricted
							? 'Internal account/resourcing review with sensitive stakeholder or personnel discussion'
							: internal
								? 'Internal RELEX meeting'
								: level === 1
									? 'Customer present in meeting audience'
									: 'Meeting audience requires internal review'
					});
			}
		}
	return result;
}
export function ensureWorkspace(id: string) {
	if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid workspace identifier.');
	if (db().prepare('SELECT id FROM memory_workspaces WHERE id=?').get(id)) return;
	transaction(() => {
		db().prepare('INSERT INTO memory_workspaces VALUES (?,0,?)').run(id, new Date().toISOString());
		const insert = db().prepare('INSERT INTO memory_sources VALUES (?,?,?,?,?,?)');
		for (const { source, basis } of records())
			insert.run(id, source.id, 'acme', source.level, JSON.stringify(source), basis);
	});
}
export function epoch(workspaceId: string) {
	return Number(
		db().prepare('SELECT epoch FROM memory_workspaces WHERE id=?').get(workspaceId)?.epoch ?? -1
	);
}
export function context(workspaceId: string, personaId = 'p1', level?: Level): Context {
	ensureWorkspace(workspaceId);
	const persona = resolvePersona(personaId);
	if (!persona) throw new Error('Unknown demo identity.');
	const selected = level ?? persona.level;
	if (![1, 2, 3].includes(selected) || selected > persona.level)
		throw new Error('Access level exceeds this identity’s clearance.');
	return {
		workspaceId,
		persona: visiblePersona(workspaceId, persona),
		projectId: 'acme',
		level: selected,
		epoch: epoch(workspaceId)
	};
}
function visiblePersona(workspaceId: string, persona: Persona): Persona {
	const copy = { ...persona, projects: [...persona.projects] };
	if (suppressed(workspaceId, `${persona.name} ${persona.email}`)) {
		const index = personas.findIndex((p) => p.id === persona.id) + 1;
		copy.name = `Project member ${index}`;
		copy.role = 'Project member';
		copy.email = `project-member-${index}@relexsolutions.example`;
	}
	return copy;
}
export function visiblePersonas(ctx: Context): Persona[] {
	return personas.map((p) => visiblePersona(ctx.workspaceId, p));
}
function permitted(ctx: Context) {
	const identity = resolvePersona(ctx.persona.id);
	return (
		!!identity &&
		identity.projects.includes(ctx.projectId) &&
		ctx.projectId === 'acme' &&
		ctx.level <= identity.level &&
		[1, 2, 3].includes(ctx.level) &&
		ctx.epoch === epoch(ctx.workspaceId)
	);
}
function writable(ctx: Context) {
	if (!permitted(ctx)) throw new Error('Workspace access changed. Reload before continuing.');
}
export function sources(ctx: Context): Source[] {
	if (!permitted(ctx)) return [];
	return db()
		.prepare(
			'SELECT payload FROM memory_sources WHERE workspace_id=? AND project_id=? AND level<=? ORDER BY id'
		)
		.all(ctx.workspaceId, ctx.projectId, ctx.level)
		.map((r) => JSON.parse(String(r.payload)));
}
export function getSource(ctx: Context, id: string): Source | undefined {
	if (!permitted(ctx)) return undefined;
	const row = db()
		.prepare(
			'SELECT payload FROM memory_sources WHERE workspace_id=? AND project_id=? AND level<=? AND id=?'
		)
		.get(ctx.workspaceId, ctx.projectId, ctx.level, id);
	return row ? JSON.parse(String(row.payload)) : undefined;
}
export function claims(ctx: Context): Claim[] {
	if (!permitted(ctx)) return [];
	const available = new Set(sources(ctx).map((s) => s.id));
	return db()
		.prepare('SELECT payload FROM memory_claims WHERE workspace_id=? AND project_id=? AND level<=?')
		.all(ctx.workspaceId, ctx.projectId, ctx.level)
		.map((r) => JSON.parse(String(r.payload)) as Claim)
		.filter((c) => c.sourceIds.length > 0 && c.sourceIds.every((id) => available.has(id)));
}
export function replaceClaims(ctx: Context, values: Claim[]) {
	writable(ctx);
	const available = new Map(sources(ctx).map((s) => [s.id, s]));
	for (const claim of values) {
		if (
			!claim.id ||
			!claim.text ||
			!claim.sourceIds.length ||
			claim.sourceIds.some((id) => !available.has(id)) ||
			![1, 2, 3].includes(claim.level) ||
			claim.level !== ctx.level ||
			claim.sourceIds.some((id) => available.get(id)!.level > claim.level) ||
			suppressed(ctx.workspaceId, JSON.stringify(claim))
		)
			throw new Error('Claim lacks permitted surviving evidence.');
	}
	transaction(() => {
		db()
			.prepare('DELETE FROM memory_claims WHERE workspace_id=? AND project_id=? AND level=?')
			.run(ctx.workspaceId, ctx.projectId, ctx.level);
		for (const c of values)
			db()
				.prepare(
					'INSERT INTO memory_claims VALUES (?,?,?,?,?) ON CONFLICT(workspace_id,id) DO UPDATE SET level=excluded.level,payload=excluded.payload'
				)
				.run(ctx.workspaceId, c.id, ctx.projectId, c.level, JSON.stringify(c));
	});
}
export function addSource(ctx: Context, source: Source) {
	writable(ctx);
	if (![1, 2, 3].includes(source.level) || source.level > ctx.level)
		throw new Error('Source exceeds the current access level.');
	if (suppressed(ctx.workspaceId, JSON.stringify(source)))
		throw new Error('This message contains previously erased personal information.');
	db()
		.prepare(
			'INSERT INTO memory_sources VALUES (?,?,?,?,?,?) ON CONFLICT(workspace_id,id) DO NOTHING'
		)
		.run(
			ctx.workspaceId,
			source.id,
			ctx.projectId,
			source.level,
			JSON.stringify(source),
			'Runtime source classified by authenticated audience policy'
		);
}
function personId(name: string) {
	return normalize(name)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
function signatureRoles(name: string, evidence: Source[]): string[] {
	const result = new Set<string>();
	for (const source of evidence) {
		if (normalize(source.author) !== normalize(name)) continue;
		const lines = source.text.split('\n').map((s) => s.trim());
		for (let i = 0; i < lines.length - 1; i++)
			if (normalize(lines[i]) === normalize(name)) {
				const role = lines[i + 1].replace(/\s*(?:\[?Image|Bild borttagen).*$/i, '').trim();
				if (
					role.length < 5 ||
					role.length > 70 ||
					!/[a-z]/i.test(role) ||
					/@|https?:|\d{3}/.test(role)
				)
					continue;
				if (/manager|consultant|officer|director|lead|architect|executive|partner/i.test(role))
					result.add(role);
			}
	}
	return [...result];
}
function explicitIdentifiers(name: string, evidence: Source[]): string[] {
	const result = new Set<string>();
	const numericPattern = new RegExp(
		`^(\\d{6})\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`,
		'mu'
	);
	for (const source of evidence) {
		const numeric = numericPattern.exec(source.text);
		if (numeric) result.add(numeric[1]);
		if (normalize(source.author) !== normalize(name)) continue;
		const lines = source.text.split('\n');
		const signature = lines.findLastIndex((line) => normalize(line.trim()) === normalize(name));
		if (signature < 0) continue;
		const tail = lines.slice(signature, signature + 10).join('\n');
		for (const match of tail.matchAll(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g)) result.add(match[0]);
		for (const match of tail.matchAll(/\+\d[\d ()-]{6,}\d/g)) result.add(match[0].trim());
	}
	return [...result];
}
function roleAliases(role: string): string[] {
	const parts = role
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return [role, ...(parts.length === 2 ? [`${parts[1]} ${parts[0]}`, parts[0]] : [])];
}
export function people(ctx: Context): Person[] {
	const permittedSources = sources(ctx);
	const canonical = new Map<string, string>();
	for (const s of permittedSources)
		for (const name of [s.author, ...s.participants]) {
			if (
				!/^[\p{L}][\p{L} .’'-]+ [\p{L} .’'-]+$/u.test(name) ||
				/^(Me|Them|Project memory|Acme memory|Unknown Speaker|Guest \d+)$/i.test(name)
			)
				continue;
			const key = normalize(name);
			if (!canonical.has(key) || /[^\x00-\x7F]/.test(name)) canonical.set(key, name);
		}
	for (const s of permittedSources)
		for (const match of s.text.matchAll(/^\d{6}\s+([\p{L}]+(?:[ ’'-][\p{L}]+)+),/gmu))
			canonical.set(normalize(match[1]), match[1]);
	const knownFirst = [...new Set([...canonical.values()].map((name) => name.split(' ')[0]))];
	for (const first of knownFirst) {
		const pattern = new RegExp(
			`(?<![\\p{L}])${first} ([\\p{Lu}][\\p{Ll}]+(?:[-’'][\\p{Lu}\\p{Ll}]+)*)`,
			'gu'
		);
		for (const source of permittedSources)
			for (const match of source.text.matchAll(pattern))
				canonical.set(normalize(match[0]), match[0]);
	}
	const names = new Set(canonical.values());
	const firstCounts = new Map<string, number>();
	const lastCounts = new Map<string, number>();
	for (const name of names) {
		firstCounts.set(
			normalize(name.split(' ')[0]),
			(firstCounts.get(normalize(name.split(' ')[0])) ?? 0) + 1
		);
		const last = normalize(name.split(' ').at(-1)!);
		lastCounts.set(last, (lastCounts.get(last) ?? 0) + 1);
	}
	return [...names]
		.sort()
		.map((name) => {
			const authored = permittedSources.filter((s) => normalize(s.author) === normalize(name));
			const participantEmails = permittedSources.flatMap((s) =>
				s.participants.flatMap((p, i) =>
					normalize(p) === normalize(name) && s.participants[i + 1]?.includes('@')
						? [s.participants[i + 1]]
						: []
				)
			);
			const email = authored.find((s) => s.email)?.email?.from ?? participantEmails[0] ?? '';
			const first = name.split(' ')[0];
			const last = name.split(' ').at(-1)!;
			const aliases = [
				name,
				normalize(name),
				...explicitIdentifiers(name, permittedSources),
				...(email ? [email] : []),
				...(firstCounts.get(normalize(first)) === 1 ? [first] : []),
				...(lastCounts.get(normalize(last)) === 1 ? [last] : [])
			];
			const mentions = matcher(aliases);
			const related = permittedSources.filter(
				(s) =>
					normalize(s.author) === normalize(name) ||
					s.participants.includes(name) ||
					mentions(s.text)
			);
			const role =
				signatureRoles(name, permittedSources)[0] ??
				personas.find((p) => p.name === name)?.role ??
				(email.endsWith('@acme-org.example')
					? 'Acme stakeholder'
					: email.endsWith('@relexsolutions.example')
						? 'RELEX project team'
						: email.includes('meridian')
							? 'Meridian partner'
							: 'Project participant');
			return {
				id: personId(name),
				name,
				email,
				role,
				aliases: [...new Set(aliases)],
				sourceIds: related.map((s) => s.id)
			};
		})
		.filter((p) => !suppressed(ctx.workspaceId, p.name));
}
export function personAliases(ctx: Context, id: string) {
	return people(ctx).find((p) => p.id === id)?.aliases ?? [];
}
type ErasureHook = (workspaceId: string, aliases: string[], sourceIds: string[]) => number;
const erasureHooks: ErasureHook[] = [];
export function registerErasureHook(hook: ErasureHook) {
	if (!erasureHooks.includes(hook)) erasureHooks.push(hook);
}
export function erasePerson(ctx: Context, id: string) {
	writable(ctx);
	if (ctx.level !== 3 || !resolvePersona(ctx.persona.id)?.canErase)
		throw new Error('Restricted project access is required to erase a person.');
	const person = people(ctx).find((p) => p.id === id);
	if (!person) throw new Error('Person is unavailable in this workspace.');
	const receipt = transaction(() => {
		const aliases = person.aliases;
		const allSources = sources(ctx);
		const allPeople = people(ctx);
		const otherRoles = allPeople
			.filter((p) => p.id !== person.id)
			.flatMap((p) => signatureRoles(p.name, allSources).flatMap(roleAliases))
			.map(normalize);
		const descriptions = signatureRoles(person.name, allSources)
			.flatMap(roleAliases)
			.filter((role) => !otherRoles.includes(normalize(role)));
		const firstName = person.name.split(' ')[0];
		const sameFirstOthers = allPeople.filter(
			(p) => p.id !== person.id && normalize(p.name.split(' ')[0]) === normalize(firstName)
		);
		const exact = matcher([...aliases, ...descriptions]);
		const firstMention = matcher([firstName]);
		const anotherIdentity = matcher(sameFirstOthers.map((p) => p.name));
		const targetDocuments = new Set(
			allSources
				.filter((s) => contains(s.author, [person.name]) || contains(s.text, [person.name]))
				.map((s) => s.documentId)
		);
		const identifies = (text: string, documentId?: string) =>
			exact(text) ||
			(sameFirstOthers.length > 0 &&
				documentId !== undefined &&
				targetDocuments.has(documentId) &&
				firstMention(text) &&
				!anotherIdentity(text));
		const otherNames = matcher(
			allPeople
				.filter((p) => p.id !== person.id)
				.flatMap((p) => [p.name, ...p.aliases.filter((a) => !a.includes(' ') && !a.includes('@'))])
		);
		const contextual = new Set<string>();
		// A named or uniquely role-labelled passage anchors nearby pronoun continuations.
		// The window stays within one document and stops at an explicitly named other person.
		const grouped = new Map<string, Source[]>();
		for (const source of allSources) {
			const group = grouped.get(source.documentId) ?? [];
			group.push(source);
			grouped.set(source.documentId, group);
		}
		for (const group of grouped.values()) {
			if (!group.some((s) => s.type === 'meeting_transcript')) continue;
			for (let i = 0; i < group.length; i++) {
				if (!identifies(group[i].text, group[i].documentId) && !contains(group[i].author, aliases))
					continue;
				for (let j = i + 1; j <= Math.min(i + 5, group.length - 1); j++) {
					const text = group[j].text;
					if (otherNames(text)) break;
					if (
						/\b(she|her|hers|he|him|his|they|their|theirs|them)\b/i.test(text) ||
						descriptions.some((role) => contains(text, [role]))
					)
						contextual.add(group[j].id);
				}
			}
		}
		const changed: string[] = [];
		let removed = 0;
		for (const source of allSources) {
			if (
				contextual.has(source.id) ||
				contains(source.author, aliases) ||
				contains(source.email?.from ?? '', aliases) ||
				contains(source.id, aliases) ||
				contains(source.documentId, aliases)
			) {
				db()
					.prepare('DELETE FROM memory_sources WHERE workspace_id=? AND id=?')
					.run(ctx.workspaceId, source.id);
				changed.push(source.id);
				removed++;
				continue;
			}
			const cleaned = { ...source };
			const paragraphs = source.text.split(/\n\s*\n/).map((paragraph) => {
				const lines = paragraph.split('\n');
				// Structured identifier rows describe independent people and can be removed separately.
				if (lines.filter((line) => /^\d{6}\s+[\p{L}]/u.test(line.trim())).length > 1)
					return lines.filter((line) => !identifies(line, source.documentId)).join('\n');
				const sentences = paragraph.split(/(?<=[.!?])\s+(?=[\p{Lu}])/u);
				if (sentences.length > 1 && identifies(paragraph, source.documentId)) {
					const remove = new Set<number>();
					sentences.forEach((sentence, i) => {
						if (!identifies(sentence, source.documentId)) return;
						remove.add(i);
						for (let j = i + 1; j <= Math.min(i + 2, sentences.length - 1); j++) {
							if (otherNames(sentences[j])) break;
							if (/\b(she|her|hers|he|him|his|they|their|theirs|them)\b/i.test(sentences[j]))
								remove.add(j);
						}
					});
					return sentences.filter((_, i) => !remove.has(i)).join(' ');
				}
				return paragraph;
			});
			const withdraw = new Set<number>();
			paragraphs.forEach((paragraph, i) => {
				if (!identifies(paragraph, source.documentId)) return;
				withdraw.add(i);
				for (let j = i + 1; j <= Math.min(i + 2, paragraphs.length - 1); j++) {
					if (otherNames(paragraphs[j])) break;
					if (/\b(she|her|hers|he|him|his|they|their|theirs|them)\b/i.test(paragraphs[j]))
						withdraw.add(j);
				}
			});
			cleaned.text = paragraphs.filter((_, i) => !withdraw.has(i)).join('\n\n');
			cleaned.title = identifies(source.title, source.documentId) ? 'Project source' : source.title;
			cleaned.participants = source.participants.filter((p) => !contains(p, aliases));
			if (source.email)
				cleaned.email = {
					...source.email,
					to: source.email.to.filter((p) => !contains(p, aliases)),
					cc: source.email.cc.filter((p) => !contains(p, aliases))
				};
			if (JSON.stringify(cleaned) !== JSON.stringify(source)) {
				changed.push(source.id);
				if (!cleaned.text.trim()) {
					db()
						.prepare('DELETE FROM memory_sources WHERE workspace_id=? AND id=?')
						.run(ctx.workspaceId, source.id);
					removed++;
				} else
					db()
						.prepare('UPDATE memory_sources SET payload=? WHERE workspace_id=? AND id=?')
						.run(JSON.stringify(cleaned), ctx.workspaceId, source.id);
			}
		}
		let artifacts = Number(
			db()
				.prepare('SELECT COUNT(*) AS n FROM memory_claims WHERE workspace_id=?')
				.get(ctx.workspaceId)?.n ?? 0
		);
		// All interpretations are rebuilt after erasure; surviving primary evidence remains available.
		db().prepare('DELETE FROM memory_claims WHERE workspace_id=?').run(ctx.workspaceId);
		for (const hook of erasureHooks) artifacts += hook(ctx.workspaceId, aliases, changed);
		for (const alias of aliases)
			db()
				.prepare('INSERT OR IGNORE INTO memory_suppression VALUES (?,?)')
				.run(ctx.workspaceId, hash(ctx.workspaceId, tokens(alias).join(' ')));
		db().prepare('UPDATE memory_workspaces SET epoch=epoch+1 WHERE id=?').run(ctx.workspaceId);
		const receipt = {
			id: randomUUID(),
			createdAt: new Date().toISOString(),
			sourcesRemoved: removed,
			artifactsRemoved: artifacts
		};
		db()
			.prepare('INSERT INTO memory_receipts VALUES (?,?,?,?,?)')
			.run(ctx.workspaceId, receipt.id, receipt.createdAt, removed, artifacts);
		return receipt;
	});
	db().exec('PRAGMA wal_checkpoint(TRUNCATE)');
	return receipt;
}
export function erasedReceipts(ctx: Context) {
	if (!permitted(ctx) || ctx.level !== 3) return [];
	return db()
		.prepare(
			'SELECT id,created_at AS createdAt,sources_removed AS sourcesRemoved,artifacts_removed AS artifactsRemoved FROM memory_receipts WHERE workspace_id=? ORDER BY created_at DESC'
		)
		.all(ctx.workspaceId) as unknown as {
		id: string;
		createdAt: string;
		sourcesRemoved: number;
		artifactsRemoved: number;
	}[];
}
export function resetWorkspace(id: string) {
	// A reset creates an isolated workspace so old jobs and judge sessions retain their erasure state.
	const next = `demo_${randomUUID().replaceAll('-', '')}`;
	ensureWorkspace(next);
	return next;
}
