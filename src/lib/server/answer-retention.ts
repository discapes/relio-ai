import type { Answer, Source } from '../types';

// Retention checks the displayed statements and their exact support. It does not
// attempt to reconstruct every influence of the original model context.
export function retainAnswer(
	answer: Answer,
	sources: Map<string, Source>,
	isSuppressed: (text: string) => boolean,
	strict = true
): Answer | null {
	const valid = new Map<number, Answer['citations'][number]>();
	answer.citations.forEach((citation, index) => {
		const source = sources.get(citation.sourceId);
		if (!source || !citation.quote.trim() || !source.text.includes(citation.quote)) return;
		const current = {
			...citation,
			title: source.title,
			author: source.author,
			date: source.date,
			position: source.position
		};
		if (!isSuppressed(JSON.stringify(current))) valid.set(index + 1, current);
	});
	const normalizedText = answer.text.replace(
		/\[(\d+(?:\s*[,–-]\s*\d+)+)\]/g,
		(marker, content: string) => {
			const references: number[] = [];
			for (const part of content.split(',')) {
				const range = part.trim().split(/[-–]/).map(Number);
				const first = range[0],
					last = range[1] ?? first;
				if (first < 1 || last < first || last > answer.citations.length) return marker;
				for (let ref = first; ref <= last; ref++) references.push(ref);
			}
			return references.map((ref) => `[${ref}]`).join('');
		}
	);
	const blocks = normalizedText.split(/\n\s*\n/);
	const kept: string[] = [];
	let removedPrevious = false;
	for (const block of blocks) {
		const refs = [...block.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
		const dependent =
			removedPrevious &&
			/^(?:\s*[-*]\s*)?(?:he|she|they|his|her|their|this|that|these|those|it)\b/i.test(block);
		if (
			isSuppressed(block) ||
			/\[\d+\s*[,–-][\d\s,–-]*\]/.test(block) ||
			refs.some((ref) => !valid.has(ref)) ||
			dependent ||
			(strict && !refs.length)
		) {
			removedPrevious = true;
			continue;
		}
		kept.push(block);
		removedPrevious = false;
	}
	if (!kept.length) return null;
	const referenced = [
		...new Set([...kept.join('\n\n').matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])))
	];
	const positions = new Map(referenced.map((ref, index) => [ref, index + 1]));
	const text = kept
		.join('\n\n')
		.replace(/\[(\d+)\]/g, (_, value) => `[${positions.get(Number(value))}]`);
	return {
		...answer,
		text,
		citations: referenced.map((ref) => valid.get(ref)!),
		question:
			answer.question && isSuppressed(answer.question)
				? 'Question about the remaining project evidence'
				: answer.question,
		trace: strict
			? ['Retained passages checked against surviving project evidence.']
			: answer.trace.filter((item) => !isSuppressed(item)),
		...(kept.length < blocks.length
			? { snapshotNote: 'Some passages were removed with their evidence.' }
			: {})
	};
}
