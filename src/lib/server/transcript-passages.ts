import type { Source } from '../types';

/** Complete syntactically unfinished adjacent fragments without joining different speakers. */
export function completeTranscriptPassages(ids: string[], sources: Source[]) {
	const selected = new Set(ids);
	const index = new Map(sources.map((source, i) => [source.id, i]));
	const ordinal = (source: Source) => Number(source.id.match(/#utterance-(\d+)$/)?.[1]);
	const unfinished = (text: string) =>
		!/[.!?]["'”’)]*\s*$/.test(text) || /\.{2,}["'”’)]*\s*$/.test(text);
	const connects = (left: Source | undefined, right: Source | undefined) =>
		left &&
		right &&
		left.type === 'meeting_transcript' &&
		right.type === 'meeting_transcript' &&
		left.documentId === right.documentId &&
		left.author === right.author &&
		ordinal(right) === ordinal(left) + 1 &&
		unfinished(left.text);
	for (const id of ids) {
		const at = index.get(id);
		if (at === undefined) continue;
		let start = at,
			end = at;
		while (start > 0 && connects(sources[start - 1], sources[start])) start--;
		while (end + 1 < sources.length && connects(sources[end], sources[end + 1])) end++;
		for (let i = start; i <= end; i++) selected.add(sources[i].id);
	}
	return [...selected];
}
