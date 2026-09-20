import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { error } from '@sveltejs/kit';
import type { Context } from '$lib/types';
export const submissionDocuments = [
	{ slug: 'design', file: 'DESIGN.md', title: 'One-page design' },
	{ slug: 'answers', file: 'practice_reference.md', title: 'Reviewed practice answers' },
	{ slug: 'evaluation', file: 'practice_review.md', title: 'Earlier model evaluations' },
	{
		slug: 'quality',
		file: 'model_quality_review.md',
		title: 'Latest model evaluation and limitations'
	},
	{ slug: 'generated', file: 'PRACTICE_ANSWERS.md', title: 'Actual generated practice answers' },
	{ slug: 'validation', file: 'VALIDATION.md', title: 'Validation record' },
	{ slug: 'pitch', file: 'PITCH.md', title: 'Five-minute pitch' },
	{ slug: 'solution', file: 'SOLUTION.md', title: 'Solution and operations' }
];
export function submissionDocument(ctx: Context, slug: string) {
	const document = submissionDocuments.find((item) => item.slug === slug);
	if (!document) error(404, 'Document unavailable');
	if (!ctx.persona.projects.includes(ctx.projectId) || ctx.level !== 3)
		error(403, 'Submission reference documents require the Acme L3 view.');
	if (ctx.epoch !== 0)
		error(
			403,
			'These reviewed documents quote the original archive and are unavailable after erasure in this workspace. Use the surviving project memory and sources.'
		);
	return { ...document, text: readFileSync(resolve('docs', document.file), 'utf8') };
}
