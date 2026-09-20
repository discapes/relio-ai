import type { Source } from '../types';

/** Resolve transcript dependencies using complete speaker turns and explicit person references. */
export function transcriptDependents(
	records: Source[],
	identifies: (text: string, documentId?: string) => boolean,
	authoredByTarget: (author: string) => boolean,
	namesAnotherPerson: (text: string) => boolean
) {
	const removed = new Set<string>();
	const groups = new Map<string, Source[]>();
	for (const record of records)
		if (record.type === 'meeting_transcript') {
			const group = groups.get(record.documentId) || [];
			group.push(record);
			groups.set(record.documentId, group);
		}
	const personal = /\b(she|her|hers|he|him|his|they|their|theirs|them|you|your|yours)\b/i;
	const topicChange =
		/\b(?:next (?:item|topic|question)|last question|moving on|let['’]s move on|back to the agenda|on another topic)\b/i;
	for (const group of groups.values()) {
		const turns: { author: string; records: Source[]; text: string }[] = [];
		for (const record of group) {
			const previous = turns.at(-1);
			const target = identifies(record.text, record.documentId) || authoredByTarget(record.author);
			const independentSubject = !target && namesAnotherPerson(record.text);
			const previousIndependent =
				previous &&
				!identifies(previous.text, record.documentId) &&
				namesAnotherPerson(previous.text);
			if (
				previous?.author === record.author &&
				!independentSubject &&
				!(target && previousIndependent) &&
				!topicChange.test(record.text)
			) {
				previous.records.push(record);
				previous.text += ' ' + record.text;
			} else turns.push({ author: record.author, records: [record], text: record.text });
		}
		for (let i = 0; i < turns.length; i++) {
			const anchor = turns[i];
			if (!identifies(anchor.text, group[0].documentId) && !authoredByTarget(anchor.author))
				continue;
			for (const record of anchor.records) removed.add(record.id);
			let lastDependent = i;
			for (let j = i + 1; j < turns.length && j <= lastDependent + 5; j++) {
				const turn = turns[j];
				const target = identifies(turn.text, group[0].documentId) || authoredByTarget(turn.author);
				if (!target && (namesAnotherPerson(turn.text) || topicChange.test(turn.text))) break;
				if (target || personal.test(turn.text)) {
					// Preserve the complete exchange that connects two established references.
					for (let k = lastDependent + 1; k <= j; k++)
						for (const record of turns[k].records) removed.add(record.id);
					lastDependent = j;
				}
			}
		}
	}
	return removed;
}
