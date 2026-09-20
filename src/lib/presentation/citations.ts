import type { Citation } from '../types';

export type CitationToken =
	| { type: 'text'; text: string }
	| {
			type: 'references';
			text: string;
			numbers: number[];
			label: string;
	  };
export type NumberedCitation = Citation & { number: number };
export interface EvidenceGroup {
	documentId: string;
	title: string;
	meeting: boolean;
	excerpts: NumberedCitation[];
	passages: NumberedCitation[][];
}

export function referenceLabel(numbers: number[]): string {
	const runs: string[] = [];
	for (let i = 0; i < numbers.length; i++) {
		const start = numbers[i];
		let end = start;
		while (numbers[i + 1] === end + 1) end = numbers[++i];
		runs.push(end > start + 1 ? `${start}–${end}` : end > start ? `${start}, ${end}` : `${start}`);
	}
	return runs.join(', ');
}

// Parse only numeric receipt markers. Text stays escaped by Svelte, including unknown markers.
export function citationTokens(text: string, citations: Citation[]): CitationToken[] {
	const tokens: CitationToken[] = [];
	const pattern = /\[\d+(?:\s*[,–-]\s*\d+)*\]/g;
	let cursor = 0;
	for (const match of text.matchAll(pattern)) {
		if (match.index > cursor) tokens.push({ type: 'text', text: text.slice(cursor, match.index) });
		const numbers: number[] = [];
		let valid = true;
		for (const marker of match[0].matchAll(/\[([^\]]+)\]/g)) {
			for (const part of marker[1].split(',')) {
				if (!/^\s*\d+\s*(?:[–-]\s*\d+\s*)?$/.test(part)) {
					valid = false;
					break;
				}
				const [first, last = first] = part.trim().split(/[–-]/).map(Number);
				if (first < 1 || last < first || last > citations.length) {
					valid = false;
					break;
				}
				for (let number = first; number <= last; number++) {
					if (!citations[number - 1]?.sourceId) valid = false;
					if (!numbers.includes(number)) numbers.push(number);
				}
			}
		}
		tokens.push(
			valid && numbers.length
				? { type: 'references', text: match[0], numbers, label: referenceLabel(numbers) }
				: { type: 'text', text: match[0] }
		);
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) tokens.push({ type: 'text', text: text.slice(cursor) });
	const merged: CitationToken[] = [];
	for (const token of tokens) {
		const space = merged.at(-1);
		const previous = merged.at(-2);
		if (
			token.type === 'references' &&
			previous?.type === 'references' &&
			space?.type === 'text' &&
			/^[ \t]*$/.test(space.text)
		) {
			merged.pop();
			previous.text += space.text + token.text;
			previous.numbers = [...new Set([...previous.numbers, ...token.numbers])];
			previous.label = referenceLabel(previous.numbers);
		} else if (token.type === 'references' && space?.type === 'references') {
			space.text += token.text;
			space.numbers = [...new Set([...space.numbers, ...token.numbers])];
			space.label = referenceLabel(space.numbers);
		} else merged.push(token);
	}
	return merged;
}

export function groupCitations(citations: Citation[]): EvidenceGroup[] {
	const groups = new Map<string, EvidenceGroup>();
	citations.forEach((citation, index) => {
		const documentId = citation.sourceId.split('#')[0];
		let group = groups.get(documentId);
		if (!group) {
			group = {
				documentId,
				title: citation.title,
				meeting: documentId.startsWith('transcripts/'),
				excerpts: [],
				passages: []
			};
			groups.set(documentId, group);
		}
		group.excerpts.push({ ...citation, number: index + 1 });
	});
	for (const group of groups.values()) {
		// Only consecutive recorded turns form a passage; omitted turns stay visibly separate.
		const ordered = [...group.excerpts].sort((a, b) =>
			a.sourceId.localeCompare(b.sourceId, undefined, { numeric: true })
		);
		for (const excerpt of ordered) {
			const previousPassage = group.passages.at(-1);
			const previous = previousPassage?.at(-1);
			const turn = /#utterance-(\d+)$/.exec(excerpt.sourceId);
			const previousTurn = previous && /#utterance-(\d+)$/.exec(previous.sourceId);
			if (turn && previousTurn && Number(turn[1]) === Number(previousTurn[1]) + 1)
				previousPassage!.push(excerpt);
			else group.passages.push([excerpt]);
		}
	}
	return [...groups.values()];
}

export function passagePosition(passage: NumberedCitation[]): string {
	const first = passage[0].position;
	const last = passage.at(-1)!.position;
	return passage.length === 1 ? first : `${first.split(' · ')[0]} – ${last.split(' · ')[0]}`;
}
