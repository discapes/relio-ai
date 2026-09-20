import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Context, ReviewerDocument } from '../types';
import { practiceGuide } from './practice-guide';

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
	if (view === 'practice' && !ctx.persona.projects.includes(ctx.projectId))
		return {
			...base,
			text: '',
			unavailable: 'Select an employee assigned to this project to read its practice answers.'
		};
	const text = readFileSync(resolve('docs', guide.file), 'utf8');
	return { ...base, text: view === 'practice' ? practiceGuide(ctx, text) : text };
}
