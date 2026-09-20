import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Context, Source } from '../types';
import { isSuppressed, sources } from './memory';

interface EvidenceManifest {
	units: Record<string, { label: string; sources: string[] }>;
	sources: Record<string, { hash: string; level: number }>;
}
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const isReferenceBlock = (block: string) =>
	/^(Sources?:|References:)/.test(block) ||
	(block.startsWith('- [') && block.includes('](/source/'));

/** Reviewed paragraphs and table rows retain their own evidence dependencies. */
export function practiceGuide(ctx: Context, document: string): string {
	const manifest = JSON.parse(
		readFileSync(resolve('docs/PRACTICE_EVIDENCE.json'), 'utf8')
	) as EvidenceManifest;
	const visible = new Map(sources(ctx).map((source) => [source.id, source]));
	const unchanged = new Set(
		[...visible.values()]
			.filter((source) => manifest.sources[source.id]?.hash === digest(source.text))
			.map((source) => source.id)
	);
	const [intro, ...sections] = document.split(/(?=## P\d\.)/);
	const output = [intro.trim()];
	for (const section of sections) {
		const [heading, ...blocks] = section.trim().split(/\n\s*\n/);
		const kept: string[] = [];
		const cited = new Map<string, Source>();
		const gaps = new Set<'removed' | 'restricted' | 'changed' | 'review'>();
		function retain(unit: string): boolean {
			const reviewed = manifest.units[digest(unit.trim())];
			let available = true;
			if (!reviewed) {
				gaps.add('review');
				return false;
			}
			if (isSuppressed(ctx.workspaceId, unit)) {
				gaps.add('removed');
				available = false;
			}
			for (const id of reviewed.sources) {
				if (unchanged.has(id)) continue;
				available = false;
				if (visible.has(id)) gaps.add('changed');
				else if (manifest.sources[id]?.level > ctx.level) gaps.add('restricted');
				else gaps.add('removed');
			}
			if (available) for (const id of reviewed.sources) cited.set(id, visible.get(id)!);
			return available;
		}
		for (const block of blocks) {
			if (isReferenceBlock(block)) continue;
			if (block.startsWith('|')) {
				const [header, separator, ...rows] = block.split('\n');
				const remaining = rows.filter(retain);
				if (remaining.length) kept.push([header, separator, ...remaining].join('\n'));
			} else if (block.startsWith('- ')) {
				const remaining = block.split('\n').filter(retain);
				if (remaining.length) kept.push(remaining.join('\n'));
			} else if (retain(block)) kept.push(block);
		}
		output.push(heading);
		if (gaps.size) {
			const reasons = {
				removed: 'supporting evidence was removed',
				restricted: 'supporting evidence requires higher access',
				changed: 'changed evidence needs review',
				review: 'a source review is needed'
			};
			const explanation = [...gaps].map((reason) => reasons[reason]).join(' and ');
			output.push(
				`${kept.length ? 'This answer is partial' : 'This answer is unavailable'} because ${explanation}.` +
					(kept.length
						? ''
						: ' You can ask about the surviving project information in Ask your project.')
			);
		}
		output.push(...kept);
		const grouped = new Map<string, Source[]>();
		for (const source of cited.values()) {
			const group = grouped.get(source.documentId) ?? [];
			group.push(source);
			grouped.set(source.documentId, group);
		}
		if (grouped.size) {
			const links = [...grouped.values()].map((group) => {
				group.sort((a, b) => a.id.localeCompare(b.id));
				const first = group[0];
				const positions = group.map((source) => Number(source.id.match(/-(\d+)$/)?.[1]));
				const ranges: string[] = [];
				for (let i = 0; i < positions.length; i++) {
					const start = positions[i];
					let end = start;
					while (positions[i + 1] === end + 1) end = positions[++i];
					ranges.push(start === end ? String(start) : `${start}–${end}`);
				}
				const label = first.id.includes('#utterance-') ? 'turns' : 'messages';
				const title = first.title.replace(/[\[\]\n]/g, ' ');
				return `[${title}](/source/${encodeURIComponent(first.id)}) (${label} ${ranges.join(', ')})`;
			});
			output.push(`Sources: ${links.join('; ')}.`);
		}
	}
	return output.join('\n\n');
}
