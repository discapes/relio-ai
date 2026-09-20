import type { Source } from '../types';

export type MeetingScope = 'all' | 'customer' | 'internal';
export function latestMeeting(sources: Source[], scope: MeetingScope = 'all') {
	const meetings = new Map<string, Source[]>();
	for (const source of sources) {
		if (source.type !== 'meeting_transcript' || !Number.isFinite(Date.parse(source.date))) continue;
		if (scope === 'customer' && source.level !== 1) continue;
		if (scope === 'internal' && !/INTERNAL/i.test(source.documentId)) continue;
		const records = meetings.get(source.documentId) || [];
		records.push(source);
		meetings.set(source.documentId, records);
	}
	const latestDate = [...meetings.values()]
		.map((records) => records[0].date)
		.sort()
		.at(-1);
	if (!latestDate) return null;
	const latest = [...meetings.values()].filter((records) => records[0].date === latestDate);
	return {
		date: latestDate,
		titles: latest.map((records) => records[0].title),
		records: latest.flat(),
		scope
	};
}
