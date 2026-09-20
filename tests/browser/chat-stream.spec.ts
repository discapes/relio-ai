import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const answer = {
	id: 'stream-browser',
	kind: 'chat',
	level: 3,
	createdAt: '2026-07-06T06:00:00Z',
	question: 'What was approved?',
	text: 'The approved scope covers 25 stores. [1]',
	citations: [
		{
			sourceId: 'emails/15_uat-signoff#message-003',
			title: 'UAT sign-off',
			date: '2025-01-21',
			author: 'Ana Duarte',
			position: 'Message 3',
			quote: 'The approved scope covers 25 stores.'
		}
	],
	trace: []
};

test.beforeEach(async ({ page }) => {
	await page.addInitScript(
		({ answer }) => {
			const original = window.fetch;
			window.fetch = (input, options) => {
				if (String(input) !== '/chat/stream') return original(input, options);
				let ended = false;
				const stream = new ReadableStream({
					start(controller) {
						const emit = (event: unknown) => {
							if (!ended)
								controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + '\n'));
						};
						options?.signal?.addEventListener('abort', () => {
							if (!ended) {
								ended = true;
								controller.error(new DOMException('Cancelled', 'AbortError'));
							}
						});
						(window as any).__finishChat = () => {
							if (!ended) {
								emit({ type: 'final', answer });
								ended = true;
								controller.close();
							}
						};
						(window as any).__failChat = () => {
							if (!ended) {
								emit({ type: 'error', message: 'Inference service interrupted. Please retry.' });
								ended = true;
								controller.close();
							}
						};
						setTimeout(
							() =>
								emit({
									type: 'stage',
									stage: 'sources',
									message: 'Found 120 permitted records across 8 documents at L3.'
								}),
							50
						);
						setTimeout(
							() => emit({ type: 'draft', text: 'The draft scope covers 25 stores. [1]' }),
							180
						);
						setTimeout(
							() =>
								emit({
									type: 'stage',
									stage: 'verifying',
									message: 'Checking the draft against original passages.'
								}),
							250
						);
					}
				});
				return Promise.resolve(
					new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } })
				);
			};
		},
		{ answer }
	);
});

test('Ask shows immediate progress and provisional streamed text, then clickable verified evidence', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('#question').fill('What was approved?');
	await page.getByRole('button', { name: 'Ask project question' }).click();
	await expect(page.getByRole('region', { name: 'Answer progress' })).toBeVisible();
	await expect(page.locator('.activity-spinner')).toBeVisible();
	await expect(page.getByRole('region', { name: 'Provisional answer' })).toContainText(
		'The draft scope covers 25 stores.'
	);
	await expect(page.locator('.stream-draft a')).toHaveCount(0);
	await expect(page.locator('.stream-draft')).not.toContainText('[1]');
	await expect(
		page.getByRole('region', { name: 'Answer progress' }).getByRole('status')
	).toContainText('Checking the draft');
	await page.locator('.chat-progress summary').click();
	await expect(page.locator('.chat-progress ol')).toContainText('120 permitted records');
	await page.locator('.chat-progress').scrollIntoViewIfNeeded();
	await page.screenshot({ path: '/tmp/receipt-chat-progress-desktop.png' });
	await page.locator('.stream-draft').screenshot({ path: '/tmp/receipt-chat-draft-desktop.png' });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
	await page.locator('.chat-progress').scrollIntoViewIfNeeded();
	await page.screenshot({ path: '/tmp/receipt-chat-progress-mobile.png' });
	await page.locator('.stream-draft').screenshot({ path: '/tmp/receipt-chat-draft-mobile.png' });
	const accessibility = await new AxeBuilder({ page }).include('.conversation').analyze();
	expect(
		accessibility.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))
	).toEqual([]);
	await page.evaluate(() => (window as any).__finishChat());
	await expect(page.locator('.stream-draft')).toHaveCount(0);
	await expect(page.locator('.answer-result .answer-text')).toContainText('The approved scope');
	await expect(page.getByRole('link', { name: 'Show evidence 1: UAT sign-off' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Ask project question' })).toBeEnabled();
});

test('Stop, errors and navigation clear the draft and keep Ask usable; identity change clears idle input', async ({
	page
}) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('#question').fill('What was approved?');
	await page.getByRole('button', { name: 'Ask project question' }).click();
	await expect(page.locator('.stream-draft')).toBeVisible();
	await page.getByRole('button', { name: 'Stop', exact: true }).click();
	await expect(page.locator('.stream-draft')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Ask project question' })).toBeEnabled();
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.locator('.stream-draft')).toBeVisible();
	await page.evaluate(() => (window as any).__failChat());
	await expect(page.getByRole('alert')).toContainText('Inference service interrupted');
	await expect(page.locator('.stream-draft')).toHaveCount(0);
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.locator('.stream-draft')).toBeVisible();
	await page.getByRole('link', { name: 'People', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'People & context', exact: true, level: 1 })
	).toBeVisible();
	await expect(page.locator('.stream-draft')).toHaveCount(0);
	await page.getByRole('link', { name: 'My workspace', exact: true }).click();
	await expect(page.locator('#question')).toHaveValue('');
	await page.locator('#question').fill('PRIVATE unsent owner-specific question');
	await page.getByRole('button', { name: 'Switch view', exact: true }).click();
	await page.locator('[name=personaId]').selectOption('p2');
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.locator('#question')).toHaveValue('');
});
