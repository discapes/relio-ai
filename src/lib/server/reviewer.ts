import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Context, ReviewerDocument } from '../types';

const guides = {
	design: { title: 'Design', file: 'DESIGN.md' },
	'how-to-use': { title: 'How to use', file: 'HOW_TO_USE.md' },
	about: { title: 'How it works', file: 'HOW_IT_WORKS.md' },
	practice: { title: 'Practice answers', file: 'PRACTICE_GUIDE.md' }
} as const;

export function reviewerGuide(ctx: Context, view: string): ReviewerDocument | null {
	if (!Object.hasOwn(guides, view)) return null;
	const guide = guides[view as keyof typeof guides];
	const base = { view, title: guide.title };
	if (view === 'practice') {
		if (!ctx.persona.projects.includes(ctx.projectId) || ctx.level !== 3)
			return { ...base, text: '', unavailable: 'These answers quote restricted Acme sources. Use the Acme L3 view to read them.' };
		if (ctx.epoch !== 0)
			return { ...base, text: '', unavailable: 'These answers refer to the original archive and are withdrawn after person erasure in this workspace. Ask the assistant using the surviving project evidence.' };
	}
	return { ...base, text: readFileSync(resolve('docs', guide.file), 'utf8') };
}
