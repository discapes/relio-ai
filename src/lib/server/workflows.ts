import { randomUUID } from 'node:crypto';
import {
	assertChatCurrent,
	chatStage,
	cancelChatStreams,
	withoutChatActivity
} from './chat-activity';
import { database } from './database';
import * as memory from './memory';
import {
	sourceExcerpt,
	evidenceOutputIssue,
	boundedEvidenceEntries,
	sourceKey,
	resolveReference,
	cancelModelCalls,
	bindCitations,
	evidenceRules,
	evidenceText,
	modelJSON
} from './model';
import type {
	Answer,
	Claim,
	Context,
	Job,
	Level,
	Mail,
	Meeting,
	Preference,
	Source,
	WorkspaceData
} from '../types';

export const AGENT_EMAIL = 'acme-memory@relexsolutions.example';
export const archiveDate = '2026-07-02';
const now = () => new Date().toISOString();
let initialized = false;
let scheduler: ReturnType<typeof setInterval> | undefined;
function requireCurrent(ctx: Context) {
	assertChatCurrent();
	if (memory.epoch(ctx.workspaceId) !== ctx.epoch || !ctx.persona.projects.includes(ctx.projectId))
		throw new Error('Project access changed. Reload before continuing.');
}

function db() {
	const d = database();
	if (!initialized) {
		d.exec(`CREATE TABLE IF NOT EXISTS wf_artifacts(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,level INTEGER NOT NULL,epoch INTEGER NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_preferences(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_mail(id TEXT NOT NULL,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(workspace_id,id));
  CREATE TABLE IF NOT EXISTS wf_meetings(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,level INTEGER NOT NULL,payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wf_jobs(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,owner TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,error TEXT,created_at TEXT NOT NULL, UNIQUE(workspace_id,owner,kind,status));`);
		for (const job of d.prepare("SELECT id,payload FROM wf_jobs WHERE status='running'").all()) {
			const pid = Number(JSON.parse(String(job.payload)).workerPid);
			let alive = false;
			if (pid) {
				try {
					process.kill(pid, 0);
					alive = true;
				} catch {
					/* Previous worker has exited. */
				}
			}
			if (!alive)
				d.prepare(
					"UPDATE wf_jobs SET status='failed',error='Application restarted. Retry this task.' WHERE id=?"
				).run(String(job.id));
		}
		for (const [legacy, opaque] of [
			['ana', 'p1'],
			['marco', 'p2'],
			['nadia', 'p3'],
			['other', 'p4']
		]) {
			for (const table of ['wf_artifacts', 'wf_preferences', 'wf_mail', 'wf_jobs'])
				d.prepare(`UPDATE ${table} SET owner=? WHERE owner=?`).run(opaque, legacy);
		}
		memory.registerErasureHook((workspaceId: string, aliases: string[], sourceIds: string[]) => {
			cancelChatStreams(workspaceId);
			cancelModelCalls(workspaceId);
			let count = 0;
			const erasedOwners = memory.personas
				.filter((p) =>
					aliases.some((alias) =>
						[p.name, p.email].some((value) => value.toLowerCase() === alias.toLowerCase())
					)
				)
				.map((p) => p.id);
			for (const table of ['wf_artifacts', 'wf_preferences', 'wf_mail', 'wf_jobs', 'wf_meetings']) {
				const rows = d
					.prepare(
						`SELECT id,payload${table === 'wf_meetings' ? '' : ',owner'} FROM ${table} WHERE workspace_id=?`
					)
					.all(workspaceId);
				for (const row of rows) {
					const text = String(row.payload).toLocaleLowerCase();
					const personal = aliases.some((alias) =>
						new RegExp(
							`(?<![\\p{L}\\p{N}])${alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
							'u'
						).test(text)
					);
					if (
						table === 'wf_artifacts' ||
						table === 'wf_jobs' ||
						erasedOwners.includes(String(row.owner || '')) ||
						personal ||
						sourceIds.some((id) => text.includes(id.toLowerCase()))
					) {
						d.prepare(`DELETE FROM ${table} WHERE workspace_id=? AND id=?`).run(
							workspaceId,
							String(row.id)
						);
						count++;
					}
				}
			}
			return count;
		});
		initialized = true;
		scheduler ||= withoutChatActivity(() =>
			setInterval(() => {
				void scheduledRefresh();
			}, 60_000)
		);
		scheduler.unref();
	}
	return d;
}
function saveArtifact(ctx: Context, answer: Answer) {
	requireCurrent(ctx);
	if (memory.isSuppressed(ctx.workspaceId, JSON.stringify(answer)))
		throw new Error(
			'Generated content refers to erased personal information. Retry with surviving evidence.'
		);
	if (memory.epoch(ctx.workspaceId) !== ctx.epoch)
		throw new Error('Project memory changed during generation. Please retry.');
	db()
		.prepare('INSERT INTO wf_artifacts VALUES(?,?,?,?,?,?,?)')
		.run(
			answer.id,
			ctx.workspaceId,
			ctx.persona.id,
			ctx.level,
			ctx.epoch,
			answer.kind,
			JSON.stringify(answer)
		);
	return answer;
}
function artifacts(ctx: Context, kind?: string): Answer[] {
	return db()
		.prepare(
			'SELECT payload FROM wf_artifacts WHERE workspace_id=? AND owner=? AND level<=? AND epoch=? ORDER BY rowid DESC'
		)
		.all(ctx.workspaceId, ctx.persona.id, ctx.level, ctx.epoch)
		.map((r) => JSON.parse(String(r.payload)) as Answer)
		.filter((a) => !kind || a.kind === kind);
}
export function preferences(ctx: Context): Preference[] {
	return db()
		.prepare('SELECT payload FROM wf_preferences WHERE workspace_id=? AND owner=? ORDER BY rowid')
		.all(ctx.workspaceId, ctx.persona.id)
		.map((r) => JSON.parse(String(r.payload)));
}
export function savePreference(ctx: Context, text: string, id?: string) {
	requireCurrent(ctx);
	if (memory.isSuppressed(ctx.workspaceId, text))
		throw new Error('This preference contains erased personal information.');
	if (!text.trim() || text.length > 2000)
		throw new Error('Enter a preference between 1 and 2,000 characters.');
	const item = { id: id || randomUUID(), text: text.trim(), createdAt: now() };
	if (id)
		db()
			.prepare('DELETE FROM wf_preferences WHERE workspace_id=? AND owner=? AND id=?')
			.run(ctx.workspaceId, ctx.persona.id, id);
	db()
		.prepare('INSERT INTO wf_preferences VALUES(?,?,?,?)')
		.run(item.id, ctx.workspaceId, ctx.persona.id, JSON.stringify(item));
	queueJob(ctx, 'brief');
	return item;
}
export function forgetPreference(ctx: Context, id: string) {
	requireCurrent(ctx);
	db()
		.prepare('DELETE FROM wf_preferences WHERE workspace_id=? AND owner=? AND id=?')
		.run(ctx.workspaceId, ctx.persona.id, id);
	queueJob(ctx, 'brief');
}
export const meetings: Meeting[] = [
	{
		id: 'bakery',
		title: 'Acme project check-in',
		date: '2026-07-08T10:00:00+03:00',
		attendees: ['Ana Duarte', 'Priya Nair', 'Nadia Haddad'],
		purpose: 'Review bakery integration, prepared extracts and outstanding Acme decisions.'
	}
];
interface ModelAnswer {
	text: string;
	citations: { sourceId: string; quote: string }[];
	trace?: string[];
	remember?: string;
	intent?: string;
	participate?: boolean;
	meeting?: Meeting;
}
async function verifyDraft(
	draft: ModelAnswer,
	question: string,
	permitted: Source[],
	ctx: Context,
	inventory: EvidenceItem[] = []
) {
	draft = {
		...draft,
		citations: (draft.citations || []).map((c) => ({
			...c,
			sourceId: resolveReference(c.sourceId, permitted)
		}))
	};
	const allowedIds = new Set(permitted.map((s) => s.id));
	const candidateIds = new Set(
		[
			...(draft.citations || []).map((c) => c.sourceId),
			...inventory.flatMap((item) => item.sourceIds)
		].filter((id) => allowedIds.has(id))
	);
	// Transcript exports split sentences across turns. Include neighbouring source records for verification.
	for (const id of [...candidateIds]) {
		const index = permitted.findIndex((s) => s.id === id);
		if (index < 0) continue;
		for (let j = Math.max(0, index - 3); j <= Math.min(permitted.length - 1, index + 3); j++) {
			if (permitted[j].documentId === permitted[index].documentId)
				candidateIds.add(permitted[j].id);
		}
	}
	const candidates = candidateIds.size
		? permitted.filter((s) => candidateIds.has(s.id))
		: permitted;
	const checked = candidates.length
		? await modelJSON<{
				statements: { text: string; sourceIds: string[]; evidenceGap?: boolean }[];
				trace?: string[];
			}>(
				evidenceRules,
				`Verify this draft against the supplied source passages at claim level. Question: ${question}\nDraft: ${JSON.stringify(draft)}\nRelevant source IDs discovered by separate research: ${JSON.stringify(inventory.flatMap((item) => item.sourceIds))}. Check completeness against the question, including every relevant dated figure and earliest occurrence. Only the original passages establish facts and speaker attribution.\nRemove or qualify factual statements these passages do not support. Preserve attribution, dates, scope, and missing attachments. Verify every numerical value appears in the cited passages. A speaker starting an interrupted number has not stated the completed number: attribute the completion to the speaker who actually said it. Add the exact source turn containing each number and approval. Do not infer a category mapping from delivery-cycle wording. A sentence fragmented across transcript turns needs every supporting turn. Return {"statements":[{"text":"one readable paragraph with no numeric citation markers","sourceIds":["exact supporting source ID"],"evidenceGap":false}],"trace":["brief verification observations"]}. Return only the final user-facing answer; omit commentary about the draft, verification, editing or removed claims. Group related facts into short paragraphs. Each factual paragraph must name its supporting IDs. Recommendations must cite the observed basis. Use an empty sourceIds list only for a clearly labelled evidence gap, with evidenceGap:true. A factual assertion or recommendation requires supporting source IDs. The application assigns citation numbers deterministically and attaches each exact original passage. Source passages:\n${evidenceText(candidates)}`,
				() => requireCurrent(ctx),
				ctx.workspaceId,
				true,
				3,
				['statements'],
				(value) => evidenceOutputIssue(value, 'statements', 'text', candidates, true)
			)
		: { statements: [{ text: draft.text, sourceIds: [] }], trace: draft.trace };
	if (!Array.isArray(checked.statements) || !checked.statements.length)
		throw new Error('Source verification returned an incomplete answer. Retry.');
	for (const statement of checked.statements)
		statement.sourceIds = (statement.sourceIds || []).map((id) => resolveReference(id, permitted));
	const byId = new Map(candidates.map((s) => [s.id, s]));
	const discarded = checked.statements.filter(
		(statement) =>
			(!(statement.sourceIds || []).length && !statement.evidenceGap) ||
			(statement.sourceIds || []).some((id) => !byId.has(id))
	);
	const statements = checked.statements.filter((statement) => !discarded.includes(statement));
	if (!statements.length)
		throw new Error(
			'A factual paragraph lacks verified source support. Please retry or narrow the question.'
		);
	const ids = [...new Set(statements.flatMap((statement) => statement.sourceIds || []))];
	const citations = ids.map((id) => {
		const source = byId.get(id);
		if (!source) throw new Error('A citation references an unavailable source. Retry.');
		return {
			sourceId: source.id,
			quote: sourceExcerpt(source),
			title: source.title,
			date: source.date,
			author: source.author,
			position: source.position
		};
	});
	let text = statements
		.map((statement) => {
			if (!(statement.sourceIds || []).length && !statement.evidenceGap)
				throw new Error(
					'A factual paragraph lacks verified source support. Please retry or narrow the question.'
				);
			if (typeof statement.text !== 'string')
				throw new Error('Source verification returned an incomplete paragraph.');
			const clean = statement.text
				.replace(/\[\d+(?:,\s*\d+)*\]/g, '')
				.replace(
					/\[[^\]]*(?:emails|transcripts|reports)\/[^\]]*#(?:message|utterance)-[^\]]*\]/g,
					''
				)
				.replace(/\b[ETR]\d{1,3}[MU]\d{1,5}\b/g, '')
				.replace(/\[[\s,]*\]/g, '')
				.replace(/\([\s,]*\)/g, '')
				.replace(/ {2,}/g, ' ')
				.trim();
			return `${clean}${(statement.sourceIds || []).map((id) => ` [${ids.indexOf(id) + 1}]`).join('')}`;
		})
		.join('\n\n');
	if (discarded.length)
		text +=
			'\n\nThe evidence supports the points above. Other parts of the question remain unverified.';
	const result: ModelAnswer = {
		text,
		citations,
		trace: [
			...(checked.trace || []),
			...(discarded.length ? [`Withheld ${discarded.length} unsupported paragraphs.`] : [])
		],
		remember: draft.remember
	};
	return { result, citations };
}
interface EvidenceItem {
	fact: string;
	sourceIds: string[];
	commitment?: {
		acceptedAction: string;
		owner: string;
		state: 'outstanding' | 'fulfilled' | 'unknown';
		acceptanceSourceIds: string[];
		followupSourceIds: string[];
	};
}
async function researchInventory(
	ctx: Context,
	question: string,
	permitted: Source[],
	commitmentFocus = false
): Promise<EvidenceItem[]> {
	const documents = [...new Set(permitted.map((source) => source.documentId))];
	const partitions = Array.from(
		{ length: Math.ceil(documents.length / 12) },
		(_, index) => new Set(documents.slice(index * 12, index * 12 + 12))
	);
	const results = await Promise.all(
		partitions.map(async (documents) => {
			const records = permitted.filter((source) => documents.has(source.documentId));
			const output = await modelJSON<{ items: EvidenceItem[] }>(
				evidenceRules,
				`${
					commitmentFocus
						? `Find candidate unfulfilled commitments for this question: ${question}. Inspect every supplied document. Return at most 8 candidates, prioritising explicit accepted actions with a later dated chase. Keep each candidate's complete local trail in one item. Separate the exact accepted action from its hoped-for outcome. Asking or chasing is fulfilled when the person asks or chases, even if the desired data remains missing. Classify state as outstanding only when follow-up evidence establishes that SAME accepted action remains undone; otherwise use unknown. Return {"items":[{"fact":"dated observation about the accepted action and follow-up","sourceIds":["exact supporting record handles"],"commitment":{"acceptedAction":"the exact action accepted, using source wording","owner":"named person or unknown","state":"outstanding|fulfilled|unknown","acceptanceSourceIds":["record handles establishing acceptance"],"followupSourceIds":["record handles establishing this action's later state"]}}]}.`
						: `Build an evidence inventory for this research question: ${question}. Inspect every supplied document. Extract all relevant dated numerical values, actor statements, proposals, approvals, completed or open actions, scope boundaries and contradictions. Preserve each occurrence for exhaustive lists or chronology. Include earlier spoken-out field names and later abbreviations. Preserve Unknown Speaker and interrupted turns. Return at most 35 items as {"items":[{"fact":"concise dated attributed observation","sourceIds":["exact supporting record handles, including adjacent fragments"]}]}.`
				}. This is source research. Use an empty items array if none are relevant. Source documents:\n${evidenceText(records)}`,
				() => requireCurrent(ctx),
				ctx.workspaceId,
				false,
				3,
				['items'],
				(value) => {
					const entries = (value as { items?: EvidenceItem[] })?.items;
					if (Array.isArray(entries))
						for (const item of entries) {
							if (
								item.commitment &&
								Array.isArray(item.commitment.followupSourceIds) &&
								!item.commitment.followupSourceIds.length
							)
								item.commitment.state = 'unknown';
						}
					const issue = evidenceOutputIssue(value, 'items', 'fact', records);
					if (issue) return issue;
					if (
						commitmentFocus &&
						(value as { items: EvidenceItem[] }).items.some((item) => !item.commitment)
					)
						return 'Every commitment candidate needs its structured commitment object';
					return undefined;
				}
			);
			chatStage(
				'research',
				`Reviewed a group of ${documents.size} documents and located ${(output.items || []).length} relevant evidence observations.`
			);
			const items = output.items || [];
			if (commitmentFocus) {
				const rank = { outstanding: 0, unknown: 1, fulfilled: 2 };
				items.sort((a, b) => rank[a.commitment!.state] - rank[b.commitment!.state]);
			}
			return boundedEvidenceEntries(items, records, commitmentFocus ? 8 : 35)
				.map((item) => ({
					...item,
					sourceIds: [
						...new Set(
							[
								...(item.sourceIds || []),
								...(item.commitment?.acceptanceSourceIds || []),
								...(item.commitment?.followupSourceIds || [])
							].map((id) => resolveReference(id, records))
						)
					],
					commitment: item.commitment
						? {
								...item.commitment,
								acceptanceSourceIds: item.commitment.acceptanceSourceIds.map((id) =>
									resolveReference(id, records)
								),
								followupSourceIds: item.commitment.followupSourceIds.map((id) =>
									resolveReference(id, records)
								)
							}
						: undefined
				}))
				.filter(
					(item) =>
						item.fact &&
						item.sourceIds.length &&
						item.sourceIds.every((id) => records.some((source) => source.id === id))
				);
		})
	);
	return results.flat();
}
async function selectOutstandingCommitment(
	ctx: Context,
	question: string,
	inventory: EvidenceItem[],
	permitted: Source[]
): Promise<EvidenceItem[]> {
	const candidates = inventory.filter((item) => item.commitment?.state === 'outstanding');
	if (!candidates.length) return [];
	const selectedIds = new Set(inventory.flatMap((item) => item.sourceIds));
	const records = permitted.filter((source) => selectedIds.has(source.id));
	type Selection = {
		candidateIds: string[];
		acceptance: { sourceId: string; quote: string };
		followup: { sourceId: string; quote: string };
		explanation: string;
	};
	const selection = await modelJSON<Selection>(
		evidenceRules,
		`Select the strongest supported unfulfilled agreement for this question: ${question}.
The inventory is a collection of tentative interpretations. Check the exact action originally accepted against later evidence for that same action. A later delivered outcome or established process defeats a claim it was never done. Missing proof of a document amendment does not establish nonperformance. Prefer a direct promise and a later direct statement that the promised deliverable has still not arrived. A requested outcome without acceptance cannot establish an agreement.
Choose one main candidate and related candidates tracing the SAME obligation. Supply two exact source quotations: the acceptance of that obligation, and a later explicit confirmation of its noncompletion. Each quote must be copied verbatim from its record, without ellipses or combined turns. Use only original records to establish this; resolve misleading candidate interpretations and consider later contrary evidence. If no candidate has both, return an empty candidateIds array and empty quote fields.
Return {"candidateIds":["K1"],"acceptance":{"sourceId":"exact record handle","quote":"verbatim acceptance"},"followup":{"sourceId":"exact record handle","quote":"verbatim later noncompletion"},"explanation":"why both describe the same accepted obligation and later evidence leaves it open"}.
Candidates: ${JSON.stringify(candidates.map((item, index) => ({ candidateId: `K${index + 1}`, ...item })))}
Other observations, including possible completion: ${JSON.stringify(inventory.filter((item) => item.commitment?.state !== 'outstanding'))}
Original records:\n${evidenceText(records)}`,
		() => requireCurrent(ctx),
		ctx.workspaceId,
		false,
		3,
		['candidateIds', 'acceptance', 'followup'],
		(value) => {
			const result = value as Selection;
			if (!Array.isArray(result.candidateIds)) return 'candidateIds must be an array';
			if (!result.candidateIds.length) return undefined;
			const chosen = result.candidateIds.map((id) =>
				candidates.find((_, index) => id === `K${index + 1}`)
			);
			if (chosen.some((item) => !item)) return 'Select only supplied candidateIds';
			for (const [field, referenceField] of [
				['acceptance', 'acceptanceSourceIds'],
				['followup', 'followupSourceIds']
			] as const) {
				const quote = result[field];
				const id =
					typeof quote?.sourceId === 'string' ? resolveReference(quote.sourceId, records) : '';
				const source = records.find((record) => record.id === id);
				if (!source || !chosen.some((item) => item!.commitment![referenceField].includes(id)))
					return `${field} must cite a selected candidate's ${referenceField} record`;
				if (
					typeof quote.quote !== 'string' ||
					!quote.quote.trim() ||
					!source.text.includes(quote.quote)
				)
					return `${field} quote must be an exact substring copied from its original record`;
			}
			return undefined;
		}
	);
	return selection.candidateIds.map((id) => candidates[Number(id.slice(1)) - 1]);
}

export async function answerQuestion(
	ctx: Context,
	question: string,
	kind = 'chat'
): Promise<Answer> {
	requireCurrent(ctx);
	chatStage('interpreting', 'Interpreting your question and checking your personal preferences.');
	if (memory.isSuppressed(ctx.workspaceId, question))
		throw new Error(
			'This question contains identifying information erased from this workspace. Rephrase without that identity.'
		);
	if (!question.trim() || question.length > 8000)
		throw new Error('Enter a question of up to 8,000 characters.');
	let research = false;
	let commitmentFocus = false;
	if (kind === 'chat') {
		const currentPreferences = preferences(ctx);
		const intent = await modelJSON<{
			action: 'remember' | 'forget' | 'list' | 'question';
			text?: string;
			ids?: string[];
			needsEvidence?: boolean;
			research?: string;
		}>(
			`Classify the employee's personal-assistant request. Use its meaning in any language. Requests to follow a topic or shape future briefings are personal preferences. Choose exactly one action: remember, forget, list or question. Return valid JSON with action, text (clean preference if remembering), ids (existing preference IDs if forgetting), and needsEvidence (boolean; true only when the user also asks for current project facts). A request to include a topic in future briefings needsEvidence=false. A factual project question is action question. A request to see saved personal preferences is list. For a factual question set research to exhaustive when it asks for all figures or a complete inventory, chronology when it asks about origins or chronology, commitments when it asks for unfulfilled promises or agreed actions still undone, otherwise standard. Return this exact object shape: {"action":"question","text":"","ids":[],"needsEvidence":true,"research":"standard"}, changing the values to match the request. Do not answer project facts.`,
			`Employee request:\n${question}\nCurrent saved preferences:\n${JSON.stringify(currentPreferences)}\nClassify this request using the required output object.`,
			() => requireCurrent(ctx),
			ctx.workspaceId,
			false,
			3,
			['action']
		);
		requireCurrent(ctx);
		if (!['remember', 'forget', 'list', 'question'].includes(intent.action))
			throw new Error('The assistant could not interpret this request. Please rephrase.');
		commitmentFocus = intent.research === 'commitments';
		research =
			intent.research === 'exhaustive' || intent.research === 'chronology' || commitmentFocus;
		let confirmation = '';
		if (intent.action === 'remember' && intent.text?.trim()) {
			const saved = savePreference(ctx, intent.text);
			confirmation = `Saved to your personal memory:\n\n${saved.text}`;
		} else if (intent.action === 'forget' && intent.ids?.length) {
			const ids = intent.ids.filter((id) => currentPreferences.some((p) => p.id === id));
			for (const id of ids) forgetPreference(ctx, id);
			confirmation = ids.length
				? 'Removed the selected preferences from your personal memory.'
				: 'No matching saved preference was found.';
		} else if (intent.action === 'list')
			confirmation = currentPreferences.length
				? `Your remembered preferences:\n\n${currentPreferences.map((p) => p.text).join('\n\n')}`
				: 'Your personal memory has no saved preferences yet.';
		if (confirmation && !intent.needsEvidence)
			return saveArtifact(ctx, {
				id: randomUUID(),
				text: confirmation,
				citations: [],
				createdAt: now(),
				kind,
				level: ctx.level,
				question,
				trace: [
					'Resolved personal-memory intent using the employee request and their private preferences.',
					'Updated or read only the selected employee’s personal memory.'
				]
			});
	}
	const permitted = memory.sources(ctx);
	chatStage(
		'sources',
		`Found ${permitted.length} permitted records across ${new Set(permitted.map((source) => source.documentId)).size} documents at L${ctx.level}.`
	);
	if (!permitted.length)
		return saveArtifact(ctx, {
			id: randomUUID(),
			text: 'No source records are available for this project and access level.',
			citations: [],
			createdAt: now(),
			kind,
			level: ctx.level,
			question,
			trace: ['Checked project membership and permitted source records.']
		});
	if (research)
		chatStage(
			'research',
			'Reviewing source documents for the requested chronology, figures or commitments.'
		);
	let inventory = research
		? await researchInventory(ctx, question, permitted, commitmentFocus)
		: [];
	if (commitmentFocus)
		inventory = await selectOutstandingCommitment(ctx, question, inventory, permitted);
	if (commitmentFocus && !inventory.length)
		return saveArtifact(ctx, {
			id: randomUUID(),
			text: 'I could not establish an accepted commitment with explicit later evidence that the same action remained undone. The available records leave that conclusion unverified.',
			citations: [],
			createdAt: now(),
			kind,
			level: ctx.level,
			question,
			trace: ['Checked candidate agreements against exact acceptance and follow-up records.']
		});
	const followupIds = new Set(
		inventory.flatMap((item) => item.commitment?.followupSourceIds || [])
	);
	const checkpoint = commitmentFocus
		? permitted
				.filter((source) => followupIds.has(source.id))
				.map((source) => source.date)
				.sort()
				.at(-1)
		: undefined;
	const scopedQuestion = checkpoint
		? `${question}\nTemporal reporting boundary: the selected follow-up evidence reaches ${checkpoint}. Describe the action as outstanding at that dated checkpoint. Coverage of subsequent events is unverified. Do not claim this is the latest instruction in the archive or that no later record exists.`
		: question;
	const inventoryIds = new Set(inventory.flatMap((item) => item.sourceIds));
	for (const id of [...inventoryIds]) {
		const index = permitted.findIndex((source) => source.id === id);
		for (let i = Math.max(0, index - 4); i <= Math.min(permitted.length - 1, index + 4); i++)
			if (permitted[i]?.documentId === permitted[index]?.documentId)
				inventoryIds.add(permitted[i].id);
	}
	const answerSources = inventory.length
		? permitted.filter((source) => inventoryIds.has(source.id))
		: permitted;
	const privateAllowed =
		kind === 'chat' || kind === 'brief' || kind === 'guidance' || kind === 'meeting';
	const privateContext = privateAllowed
		? `Employee: ${ctx.persona.name}, ${ctx.persona.role}. Current active private preferences: ${JSON.stringify(preferences(ctx))}. Only these saved preferences determine briefing priorities; earlier chat does not reinstate removed preferences. Recent private conversation: ${JSON.stringify(
				artifacts(ctx, 'chat')
					.slice(0, 4)
					.reverse()
					.map((a) => ({ question: a.question, answer: a.text }))
			)}`
		: '';
	const prepared = memory.claims(ctx).map((claim) => ({
		text: claim.text,
		status: claim.status,
		sourceIds: claim.sourceIds.map((id) => {
			const source = permitted.find((s) => s.id === id);
			return source ? sourceKey(source) : id;
		})
	}));
	const erasureContext =
		ctx.epoch > 0
			? 'Some records were withdrawn by person erasure. Use surviving evidence only. Never recommend recovering erased material from reference fixtures, attachments, old exports or prior copies. Explain resulting evidence gaps without reintroducing the erased identity.'
			: '';
	const prompt = `Task: ${scopedQuestion}\nPartitioned source inventory: ${JSON.stringify(inventory)}. Cover the requested inventory or chronology completely; check these observations against original sources. For an unfulfilled agreement, select an outstanding acceptedAction with explicit acceptance and later follow-up about that same action. A fulfilled ask/chase action cannot establish an unfulfilled promise to deliver the desired outcome.\n${erasureContext}\n${privateContext}\nReturn {"text":"answer with inline [1] citations", "citations":[{"sourceId":"existing-id","quote":"exact supporting passage"}],"trace":["concise observable evidence checks"],"remember":"only if user explicitly asks to remember/follow a preference, otherwise empty","intent":"personal_memory only for a question about the employee own remembered preferences; otherwise project"}. Only use supplied project evidence for facts. For chronology/origin questions, locate the earliest supported occurrence and later changes; names and fields may be spoken in full rather than as abbreviations. Prepared memory entries are navigation hints to check against the original records, not independent evidence: ${JSON.stringify(prepared)}.\nPermitted evidence records:\n${evidenceText(answerSources)}`;
	chatStage(
		'drafting',
		`Composing an answer from ${answerSources.length} permitted source records. Draft text will appear as the model writes it.`
	);
	const draft = await modelJSON<ModelAnswer>(
		evidenceRules,
		prompt,
		() => requireCurrent(ctx),
		ctx.workspaceId,
		false,
		kind === 'chat' || kind === 'share' ? 3 : 1,
		['text', 'citations'],
		undefined,
		true
	);
	if (!draft.text || typeof draft.text !== 'string')
		throw new Error('The model returned an incomplete answer. Retry.');
	requireCurrent(ctx);
	if (
		kind === 'chat' &&
		draft.remember?.trim() &&
		!(draft.citations || []).some((c) =>
			permitted.some((source) => source.id === resolveReference(c.sourceId, permitted))
		)
	) {
		const saved = savePreference(ctx, draft.remember.trim());
		return saveArtifact(ctx, {
			id: randomUUID(),
			text: `Saved to your personal memory:\n\n${saved.text}`,
			citations: [],
			createdAt: now(),
			kind,
			level: ctx.level,
			question,
			trace: ['Saved an employee-owned preference for future briefings.']
		});
	}
	if (kind === 'chat' && draft.intent === 'personal_memory') {
		const list = preferences(ctx);
		return saveArtifact(ctx, {
			id: randomUUID(),
			text: list.length
				? `Your remembered preferences:\n\n${list.map((p) => p.text).join('\n\n')}`
				: 'Your personal memory has no saved preferences yet.',
			citations: [],
			createdAt: now(),
			kind,
			level: ctx.level,
			question,
			trace: ['Read preferences owned by the selected employee.']
		});
	}
	requireCurrent(ctx);
	chatStage(
		'verifying',
		'Checking the draft against original passages, including numbers, dates and attribution.'
	);
	const { result, citations } = await verifyDraft(
		draft,
		scopedQuestion,
		answerSources,
		ctx,
		inventory
	);
	if (kind === 'chat' && result.remember?.trim()) savePreference(ctx, result.remember.trim());
	const answer: Answer = {
		id: randomUUID(),
		text: research
			? `Research result from the cited records. This search may omit other relevant passages.\n\n${result.text}`
			: result.text,
		citations,
		createdAt: now(),
		kind,
		level: ctx.level,
		question,
		trace: [
			`Read ${permitted.length} permitted source records at L${ctx.level}.`,
			...(research
				? [
						`Prepared ${inventory.length} evidence observations across ${Math.ceil(new Set(permitted.map((source) => source.documentId)).size / 12)} source partitions.`
					]
				: []),
			...(Array.isArray(result.trace) ? result.trace.slice(0, 5) : []),
			`Verified ${citations.length} quoted passages against runtime sources.`
		]
	};
	requireCurrent(ctx);
	chatStage(
		'binding',
		`Bound ${citations.length} source excerpts to the checked answer. Saving your conversation.`
	);
	return saveArtifact(ctx, answer);
}
export async function generateBrief(ctx: Context, meetingId?: string) {
	const upcoming = accessibleMeetings(ctx);
	const meeting = upcoming.find((m) => m.id === meetingId);
	const task = meeting
		? `Prepare me for this simulated meeting: ${JSON.stringify(meeting)}. Show relevant commitments, changes, questions to ask and evidence-backed recommendations. Mark calendar data as simulated.`
		: `Prepare my morning brief for Monday 6 July 2026, considering all subsequent delivered demo messages as new updates. Prioritise relevant changes, unresolved commitments at their last recorded follow-up, decisions needed, and preparation for these simulated meetings: ${JSON.stringify(upcoming)}. Write exactly four useful items, each 60–90 words with a short sentence-case label. Omit a repeated greeting, title and calendar header. Keep the complete brief under 400 words. Include source dates and precise evidence. Avoid repeating sensitive personal details when describing a correction or removal follow-up.`;
	return answerQuestion(ctx, task, meeting ? 'meeting' : 'brief');
}
export async function extractMemory(ctx: Context) {
	const permitted = memory.sources(ctx);
	const documents = [...new Set(permitted.map((s) => s.documentId))];
	const groups = Array.from({ length: Math.ceil(documents.length / 15) }, (_, i) =>
		documents.slice(i * 15, i * 15 + 15)
	);
	const permittedById = new Map(permitted.map((s) => [s.id, s]));
	const batches = await Promise.all(
		groups.map(async (focus) => {
			const result = await modelJSON<{
				claims: { kind: string; text: string; status: string; sourceIds: string[] }[];
			}>(
				evidenceRules,
				`Extract up to 25 useful project-memory entries focused on these documents: ${JSON.stringify(focus)}. Read this source partition completely. Extract dated observations whose status is anchored to the cited date; later batches can supply superseding decisions. Cover decisions, commitments, open questions, corrections, workstreams and supported stakeholder observations. Keep each text under 35 words, each sourceIds list at most 3 IDs and total JSON under 16,000 characters. Preserve proposal/agreement attribution, scope and date. Every entry must have a supporting source in the focus documents, and may also cite related later evidence. status must distinguish agreed, proposed, outstanding, superseded, corrected or observation. Return {"claims":[{"kind":"decision|commitment|question|correction|workstream","text":"specific dated attributed observation","status":"agreed","sourceIds":["id"]}]}.\n${evidenceText(permitted.filter((source) => focus.includes(source.documentId)))}`,
				() => requireCurrent(ctx),
				ctx.workspaceId,
				false,
				0,
				['claims'],
				(value) =>
					evidenceOutputIssue(
						value,
						'claims',
						'text',
						permitted.filter((source) => focus.includes(source.documentId))
					)
			);
			const draftClaims = boundedEvidenceEntries(result.claims || [], permitted, 25)
				.map((c) => ({
					...c,
					sourceIds: (c.sourceIds || []).map((id) => resolveReference(id, permitted))
				}))
				.filter(
					(c) =>
						c.text &&
						c.sourceIds?.length &&
						c.sourceIds.every((id) => permittedById.has(id)) &&
						c.sourceIds.some((id) => focus.includes(permittedById.get(id)!.documentId))
				);
			const ids = new Set(draftClaims.flatMap((c) => c.sourceIds));
			for (const id of [...ids]) {
				const index = permitted.findIndex((source) => source.id === id);
				for (let i = Math.max(0, index - 3); i <= Math.min(permitted.length - 1, index + 3); i++)
					if (permitted[i]?.documentId === permitted[index]?.documentId) ids.add(permitted[i].id);
			}
			const support = permitted.filter((source) => ids.has(source.id));
			const checked = await modelJSON<{
				claims: { claimId: string; text: string; sourceIds: string[] }[];
			}>(
				evidenceRules,
				`Verify each proposed memory claim against its cited source passages. Remove unsupported claims or revise them to the exact scope supported. Keep the candidate kind and temporal status: a proposed action remains proposed; an observation remains observation. Remove any candidate whose status is unsupported by its evidence. Return only {"claims":[{"claimId":"C1","text":"verified specific observation","sourceIds":["supporting ID"]}]}. Preserve each exact candidate claimId. Every claim requires source IDs. Do not add facts from general knowledge. Proposed entries: ${JSON.stringify(draftClaims.map((claim, index) => ({ ...claim, claimId: `C${index + 1}`, sourceIds: claim.sourceIds.map((id) => sourceKey(permittedById.get(id)!)) })))}\nSupporting passages:\n${evidenceText(support)}`,
				() => requireCurrent(ctx),
				ctx.workspaceId,
				true,
				0,
				['claims'],
				(value) => {
					const issue = evidenceOutputIssue(value, 'claims', 'text', support);
					if (issue) return issue;
					const output = (value as { claims: { claimId: string }[] }).claims;
					const valid = new Set(draftClaims.map((_, index) => `C${index + 1}`));
					if (
						output.some((claim) => !valid.has(claim.claimId)) ||
						new Set(output.map((claim) => claim.claimId)).size !== output.length
					)
						return 'Each verified claim must use one unique exact candidate claimId';
					return undefined;
				}
			);
			return (checked.claims || [])
				.map((c) => ({
					kind: draftClaims[Number(c.claimId.slice(1)) - 1].kind,
					status: draftClaims[Number(c.claimId.slice(1)) - 1].status,
					text: c.text,
					sourceIds: (c.sourceIds || []).map((id) => resolveReference(id, permitted))
				}))
				.filter((c) => c.text && c.sourceIds?.length && c.sourceIds.every((id) => ids.has(id)))
				.map((c) => ({ ...c, id: randomUUID(), level: ctx.level }) as Claim);
		})
	);
	const list = batches.flat();
	if (!list.length)
		console.warn(
			'memory_extraction_empty',
			JSON.stringify({ documents: documents.length, batches: batches.map((batch) => batch.length) })
		);
	if (!list.length) throw new Error('No source-backed memory entries were returned.');
	memory.replaceClaims(ctx, list);
	return list.length;
}
export function queueJob(ctx: Context, kind: string, payload: Record<string, unknown> = {}) {
	if (kind === 'mail') kind = `mail:${payload.mailId}`;
	else if (kind === 'brief' || kind === 'extract') kind = `${kind}:L${ctx.level}`;
	const d = db();
	const existing = d
		.prepare(
			"SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=? AND status IN ('queued','running')"
		)
		.get(ctx.workspaceId, ctx.persona.id, kind);
	if (existing) {
		if (kind.startsWith('brief:') || kind.startsWith('extract:'))
			d.prepare(
				"UPDATE wf_jobs SET payload=json_set(payload,'$.rerun',1) WHERE id=? AND status='running'"
			).run(String(existing.id));
		return String(existing.id);
	}
	// Completed jobs remain separately auditable; no same-state uniqueness collision.
	d.prepare(
		"DELETE FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=? AND status IN ('done','failed')"
	).run(ctx.workspaceId, ctx.persona.id, kind);
	const id = randomUUID();
	d.prepare('INSERT INTO wf_jobs VALUES(?,?,?,?,?,?,?,?)').run(
		id,
		ctx.workspaceId,
		ctx.persona.id,
		kind,
		'queued',
		JSON.stringify({ level: ctx.level, epoch: ctx.epoch, ...payload }),
		null,
		now()
	);
	schedulePump();
	return id;
}
let pumpScheduled = false;
function schedulePump() {
	if (process.env.DISABLE_BACKGROUND === '1') return;
	if (!pumpScheduled) {
		pumpScheduled = true;
		withoutChatActivity(() =>
			setTimeout(() => {
				pumpScheduled = false;
				void runJobs();
			}, 50).unref()
		);
	}
}
const activeJobs = new Set<string>();
let backgroundActive = false;
let mailActive = false;
export function runJobs() {
	return withoutChatActivity(runDetachedJobs);
}
async function runDetachedJobs() {
	const queued = db()
		.prepare(
			"SELECT * FROM wf_jobs WHERE status='queued' ORDER BY CASE WHEN kind LIKE 'mail:%' THEN 0 WHEN kind LIKE 'brief%' THEN 1 ELSE 2 END,created_at"
		)
		.all();
	for (const row of queued) {
		const id = String(row.id);
		const isMail = String(row.kind).startsWith('mail:');
		if (activeJobs.has(id) || (isMail ? mailActive : backgroundActive)) continue;
		activeJobs.add(id);
		if (isMail) mailActive = true;
		else backgroundActive = true;
		db()
			.prepare(
				"UPDATE wf_jobs SET status='running',payload=json_set(payload,'$.workerPid',?) WHERE id=?"
			)
			.run(process.pid, id);
		void (async () => {
			const payload = JSON.parse(String(row.payload));
			try {
				const ctx = memory.context(String(row.workspace_id), String(row.owner), payload.level);
				if (ctx.epoch !== payload.epoch) throw new Error('Memory changed; refresh this task.');
				if (String(row.kind).startsWith('brief')) await generateBrief(ctx);
				else if (String(row.kind).startsWith('extract')) await extractMemory(ctx);
				else if (isMail) await processMail(ctx, String(payload.mailId));
				const current = db().prepare('SELECT payload FROM wf_jobs WHERE id=?').get(id);
				if (current && JSON.parse(String(current.payload)).rerun)
					db()
						.prepare(
							"UPDATE wf_jobs SET status='queued',payload=json_remove(payload,'$.rerun') WHERE id=?"
						)
						.run(id);
				else db().prepare("UPDATE wf_jobs SET status='done',error=NULL WHERE id=?").run(id);
			} catch (error) {
				db()
					.prepare("UPDATE wf_jobs SET status='failed',error=? WHERE id=?")
					.run(error instanceof Error ? error.message : 'Task failed', id);
			} finally {
				activeJobs.delete(id);
				if (isMail) mailActive = false;
				else backgroundActive = false;
				schedulePump();
			}
		})();
	}
}
function allMails(ctx: Context): Mail[] {
	const seeded = memory
		.sources(ctx)
		.filter((s) => s.email && s.type !== 'simulated_email')
		.map(
			(s) =>
				({
					id: s.id,
					threadId: s.documentId,
					subject: s.title,
					from: s.email!.from,
					to: s.email!.to,
					cc: s.email!.cc,
					body: s.text,
					date: s.date,
					status: 'Historical archive',
					level: s.level
				}) as Mail
		);
	const added = db()
		.prepare('SELECT payload FROM wf_mail WHERE workspace_id=?')
		.all(ctx.workspaceId)
		.map((r) => JSON.parse(String(r.payload)) as Mail);
	return [...seeded, ...added]
		.filter(
			(m) =>
				m.level <= ctx.level &&
				[m.from, ...m.to, ...m.cc].some(
					(email) => email.toLowerCase() === ctx.persona.email.toLowerCase()
				)
		)
		.sort((a, b) => b.date.localeCompare(a.date));
}
function mailAudience(ctx: Context, to: string[], cc: string[]): Level {
	const recipients = [...to, ...cc].filter((x) => x !== AGENT_EMAIL);
	if (!recipients.length) {
		if ([...to, ...cc].includes(AGENT_EMAIL)) return Math.min(ctx.level, 2) as Level;
		throw new Error('Add a recipient.');
	}
	if (recipients.some((x) => !x.endsWith('@relexsolutions.example'))) return 1;
	return Math.min(
		ctx.level,
		2,
		...recipients.map((x) => memory.personas.find((p) => p.email === x)?.level ?? 1)
	) as Level;
}
export function sendMail(
	ctx: Context,
	input: {
		id?: string;
		threadId?: string;
		subject: string;
		to: string[];
		cc: string[];
		body: string;
	}
) {
	if (memory.isSuppressed(ctx.workspaceId, JSON.stringify(input)))
		throw new Error('This message contains erased personal information.');
	if (!input.subject.trim() || !input.body.trim()) throw new Error('Add a subject and message.');
	if (input.body.length > 20000) throw new Error('Keep the message under 20,000 characters.');
	for (const address of [...input.to, ...input.cc])
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
			throw new Error(`Invalid recipient address: ${address}`);
	requireCurrent(ctx);
	const id = input.id || randomUUID();
	const existing = db()
		.prepare('SELECT owner,payload FROM wf_mail WHERE workspace_id=? AND id=?')
		.get(ctx.workspaceId, id);
	if (existing && existing.owner !== ctx.persona.id)
		throw new Error('This delivery event belongs to another employee.');
	if (existing) {
		const prior = JSON.parse(String(existing.payload)) as Mail;
		if (prior.level > ctx.level)
			throw new Error('This delivery event is outside the current access level.');
		return prior;
	}
	const level = mailAudience(ctx, input.to, input.cc);
	const delivered = [...input.to, ...input.cc].includes(AGENT_EMAIL);
	const mail: Mail = {
		id,
		threadId: input.threadId || `demo/${randomUUID()}`,
		subject: input.subject,
		from: ctx.persona.email,
		to: input.to,
		cc: input.cc,
		body: input.body,
		date: '2026-07-06T09:15:00+03:00',
		status: delivered ? 'Queued for project memory' : 'Sent in simulator',
		level
	};
	db()
		.prepare('INSERT INTO wf_mail VALUES(?,?,?,?)')
		.run(id, ctx.workspaceId, ctx.persona.id, JSON.stringify(mail));
	if (delivered) queueJob(ctx, 'mail', { mailId: id });
	return mail;
}
function writeMail(ctx: Context, mail: Mail) {
	db()
		.prepare('UPDATE wf_mail SET payload=? WHERE workspace_id=? AND id=?')
		.run(JSON.stringify(mail), ctx.workspaceId, mail.id);
}
export async function processMail(original: Context, id: string) {
	const row = db()
		.prepare('SELECT payload FROM wf_mail WHERE workspace_id=? AND id=?')
		.get(original.workspaceId, id);
	if (!row) return;
	const mail = JSON.parse(String(row.payload)) as Mail;
	if (mail.status === 'Memory updated' || mail.status === 'Agent replied') return;
	const level = mailAudience(original, mail.to, mail.cc);
	const ctx = memory.context(original.workspaceId, original.persona.id, level);
	if (mail.from === AGENT_EMAIL) return;
	const source: Source = {
		id: `runtime/${mail.id}`,
		documentId: mail.threadId,
		title: mail.subject,
		type: 'simulated_email',
		date: mail.date,
		author: original.persona.name,
		text: mail.body,
		level,
		position: 'Delivered message',
		participants: [mail.from, ...mail.to, ...mail.cc],
		email: { from: mail.from, to: mail.to, cc: mail.cc }
	};
	memory.addSource(ctx, source);
	try {
		const permitted = memory.sources(ctx);
		const result = await modelJSON<ModelAnswer>(
			evidenceRules,
			`You are a visible email participant invited to listen by default. Being in Cc is not a request to speak. Unsolicited interruptions have a high attention cost: preserve the trust that keeps you included. Put helpful background into project memory and personal briefings. Speak only when your contribution is clearly valuable in the current discussion. Do not turn routine coordination into a general project audit. When uncertain about the value of an unsolicited reply, remain silent. Follow the conversation using permitted project memory. Respond when addressed directly. Participate proactively when your contribution brings substantial value, resolves an important uncertainty or prevents a consequential misunderstanding. Respect participants' attention. Stay silent when unnecessary. Acknowledging receipt alone does not add substantial value. Avoid repeating background that participants have already acknowledged; use their attention only for a material contribution. A new message has been delivered; decide independently whether to reply. Private employee memory is unavailable.\nNew message: ${JSON.stringify(mail)}\nReturn {"participate":true or false,"text":"reply with [1] citations if participating, else empty","citations":[{"sourceId":"id","quote":"exact quote"}],"trace":["brief participation reason"],"meeting":null or {"title":"scheduled event title","date":"ISO date with timezone only when specified","attendees":["named attendees"],"purpose":"what to prepare"}}. Extract a meeting only when this new message explicitly schedules one, preserving its time and stated responsibilities. The event is a simulated calendar update derived from this message.\n${evidenceText(permitted)}`,
			() => requireCurrent(ctx),
			ctx.workspaceId,
			false,
			3,
			['participate', 'citations']
		);
		requireCurrent(ctx);
		if (
			result.meeting?.title &&
			result.meeting.date &&
			Number.isFinite(Date.parse(result.meeting.date))
		) {
			const meeting = { ...result.meeting, id: `meeting-${mail.id}`, sourceIds: [source.id] };
			db()
				.prepare('INSERT OR REPLACE INTO wf_meetings VALUES(?,?,?,?)')
				.run(meeting.id, ctx.workspaceId, ctx.level, JSON.stringify(meeting));
		}
		// Ingestion and calendar publication complete independently of optional participation.
		for (const person of memory.personas.filter((p) => p.projects.includes('acme'))) {
			const target = memory.context(original.workspaceId, person.id);
			queueJob(target, 'brief');
			queueJob(target, 'extract');
		}
		let citations = bindCitations(result.citations, permitted);
		if (result.participate && result.text) {
			const verified = await verifyDraft(result, mail.body, permitted, ctx);
			result.text = verified.result.text;
			result.trace = verified.result.trace;
			citations = verified.citations;
		}
		if (memory.epoch(ctx.workspaceId) !== ctx.epoch)
			throw new Error('Memory changed during email processing.');
		if (result.participate && result.text) {
			if (!citations.length)
				throw new Error('Agent reply citation verification failed. Retry processing.');
			const answer = saveArtifact(ctx, {
				id: randomUUID(),
				text: result.text,
				citations,
				createdAt: now(),
				kind: 'email',
				level,
				trace: result.trace || []
			});
			const reply: Mail = {
				id: `reply-${id}`,
				threadId: mail.threadId,
				subject: `Re: ${mail.subject.replace(/^Re: /i, '')}`,
				from: AGENT_EMAIL,
				to: [mail.from, ...mail.to.filter((x) => x !== AGENT_EMAIL)],
				cc: mail.cc.filter((x) => x !== AGENT_EMAIL),
				body: result.text,
				date: '2026-07-06T09:16:00+03:00',
				status: 'Agent reply',
				answer,
				level
			};
			db()
				.prepare('INSERT OR IGNORE INTO wf_mail VALUES(?,?,?,?)')
				.run(reply.id, ctx.workspaceId, original.persona.id, JSON.stringify(reply));
			mail.status = 'Agent replied';
		} else mail.status = 'Memory updated';
		mail.error = undefined;
		writeMail(ctx, mail);
	} catch (error) {
		mail.status = 'Processing failed';
		mail.error = error instanceof Error ? error.message : 'Processing failed';
		writeMail(ctx, mail);
		throw error;
	}
}
export function retryMail(ctx: Context, id: string) {
	const mail = allMails(ctx).find((m) => m.id === id);
	if (!mail || mail.from !== ctx.persona.email) throw new Error('Message unavailable.');
	return queueJob(ctx, 'mail', { mailId: id });
}
export function promote(ctx: Context, text: string, level: Level) {
	if (level > ctx.level || ![1, 2, 3].includes(level))
		throw new Error('Choose an available access level.');
	if (!text.trim() || text.length > 8000)
		throw new Error('Enter a note of up to 8,000 characters.');
	memory.addSource(ctx, {
		id: `note/${randomUUID()}`,
		documentId: `notes/${ctx.persona.id}`,
		title: 'Shared note',
		type: 'shared_note',
		date: now(),
		author: ctx.persona.name,
		text,
		level,
		position: 'Employee-promoted note',
		participants: [ctx.persona.name]
	});
	queueJob(ctx, 'extract');
	queueJob(ctx, 'brief');
}
export function erase(ctx: Context, personId: string) {
	db();
	return memory.erasePerson(ctx, personId);
}
export function reset(ctx: Context) {
	cancelChatStreams(ctx.workspaceId);
	return memory.resetWorkspace(ctx.workspaceId);
}
export function workspaceData(ctx: Context): WorkspaceData {
	db();
	const sourceList = memory.sources(ctx),
		claimList = memory.claims(ctx);
	const brief = artifacts(ctx, 'brief').find((answer) => answer.level === ctx.level) || null;
	const personList = memory.people(ctx);
	const linkedIds = new Set([
		...claimList.flatMap((c) => c.sourceIds),
		...personList.flatMap((p) => p.sourceIds.slice(0, 3))
	]);
	const previews = sourceList
		.filter((source, index) => index < 80 || linkedIds.has(source.id))
		.map((source) => ({
			...source,
			text: source.text.slice(0, 320),
			participants: [],
			email: undefined
		}));
	const pending = db()
		.prepare(
			'SELECT id,kind,status,error,created_at FROM wf_jobs WHERE workspace_id=? AND owner=? ORDER BY created_at DESC'
		)
		.all(ctx.workspaceId, ctx.persona.id);
	return {
		context: ctx,
		personas: memory.visiblePersonas(ctx),
		sources: previews,
		claims: claimList,
		people: personList.map((p) => ({ ...p, sourceIds: p.sourceIds.slice(0, 20) })),
		brief,
		chat: artifacts(ctx, 'chat').reverse(),
		preferences: preferences(ctx),
		mails: allMails(ctx),
		meetings: accessibleMeetings(ctx),
		jobs: pending.map(
			(r) =>
				({
					id: String(r.id),
					kind: String(r.kind).split(':')[0],
					status: String(r.status),
					error: r.error ? String(r.error) : undefined,
					createdAt: String(r.created_at)
				}) as Job
		),
		receipts: memory.erasedReceipts(ctx),
		stats: {
			documents: new Set(sourceList.map((s) => s.documentId)).size,
			sources: sourceList.length,
			claims: claimList.length
		},
		archiveDate
	};
}
export function prepareWorkspace(ctx: Context) {
	db();
	seedPrepared(ctx);
	if (
		!artifacts(ctx, 'brief').some((answer) => answer.level === ctx.level) &&
		!db()
			.prepare('SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=?')
			.get(ctx.workspaceId, ctx.persona.id, `brief:L${ctx.level}`)
	)
		queueJob(ctx, 'brief');
	if (
		!memory.claims(ctx).some((c) => c.level === ctx.level) &&
		!db()
			.prepare('SELECT id FROM wf_jobs WHERE workspace_id=? AND owner=? AND kind=?')
			.get(ctx.workspaceId, ctx.persona.id, `extract:L${ctx.level}`)
	)
		queueJob(ctx, 'extract');
	schedulePump();
}

function seedPrepared(ctx: Context) {
	if (ctx.workspaceId === 'prepared-baseline' || ctx.epoch !== 0 || preferences(ctx).length) return;
	const baseline = db()
		.prepare(
			"SELECT payload FROM wf_artifacts WHERE workspace_id='prepared-baseline' AND owner=? AND level=? AND kind='brief' ORDER BY rowid DESC LIMIT 1"
		)
		.get(ctx.persona.id, ctx.level);
	if (baseline && !artifacts(ctx, 'brief').some((answer) => answer.level === ctx.level)) {
		const answer = JSON.parse(String(baseline.payload)) as Answer;
		saveArtifact(ctx, { ...answer, id: randomUUID() });
	}
	const stored = db()
		.prepare("SELECT payload FROM memory_claims WHERE workspace_id='prepared-baseline' AND level=?")
		.all(ctx.level);
	if (stored.length && !memory.claims(ctx).some((claim) => claim.level === ctx.level))
		memory.replaceClaims(
			ctx,
			stored.map((r) => ({ ...JSON.parse(String(r.payload)), id: randomUUID() }))
		);
}
async function scheduledRefresh() {
	const clock = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Helsinki',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		hourCycle: 'h23'
	}).format(new Date());
	if (Number(clock.slice(-2)) < 6) return;
	const users = db()
		.prepare("SELECT DISTINCT workspace_id,owner FROM wf_artifacts WHERE kind='brief'")
		.all();
	for (const user of users) {
		try {
			const ctx = memory.context(String(user.workspace_id), String(user.owner));
			const brief = artifacts(ctx, 'brief')[0];
			const day = (date: string) =>
				new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki' }).format(new Date(date));
			if (!brief || day(brief.createdAt) !== day(now())) queueJob(ctx, 'brief');
		} catch {
			/* A removed workspace has no scheduled work. */
		}
	}
	schedulePump();
}

function accessibleMeetings(ctx: Context): Meeting[] {
	if (!ctx.persona.projects.includes(ctx.projectId)) return [];
	const stored = db()
		.prepare('SELECT payload FROM wf_meetings WHERE workspace_id=? AND level<=?')
		.all(ctx.workspaceId, ctx.level)
		.map((r) => JSON.parse(String(r.payload)) as Meeting);
	return [...meetings, ...stored].filter(
		(m) => !memory.isSuppressed(ctx.workspaceId, JSON.stringify(m))
	);
}
