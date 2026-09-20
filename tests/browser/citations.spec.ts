import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { stringify } from 'devalue';

test('many cited turns stay grouped and inline references reveal exact evidence by keyboard', async ({
	page
}) => {
	let crossDocument = false;
	const citations = Array.from({ length: 41 }, (_, index) => ({
		sourceId: `transcripts/review#utterance-${String(index + 1).padStart(4, '0')}`,
		title: 'Quarterly business review',
		date: '2026-06-16',
		author: 'Ana Duarte',
		position: `2:${String(index).padStart(2, '0')} · utterance ${index + 1}`,
		quote: `Recorded observation ${index + 1} from Ana Duarte.`
	}));
	await page.route('**/*', async (route) => {
		if (route.request().method() === 'POST' && route.request().url().includes('?/ask')) {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					type: 'success',
					status: 200,
					data: stringify({
						answer: {
							id: 'citation-browser-fixture',
							kind: 'chat',
							level: 3,
							createdAt: '2026-07-06T06:00:00Z',
							question: 'What did we work on last meeting?',
							text:
								(crossDocument ? 'Combined evidence [1, 41].\n\n' : '') +
								'Ana Duarte described the review. [1] [2] [3]\n\nThe second topic has several excerpts. [4, 5, 6]\n\nThe last turn is here. [41]\n\nUnresolved reference [99]. Literal <img src=x onerror=alert(1)>.',
							citations,
							trace: []
						}
					})
				})
			});
		} else await route.continue();
	});
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('#question').fill('What did we work on last meeting?');
	await page.getByRole('button', { name: 'Ask project question' }).click();
	const answer = page.locator('.answer-result').filter({ hasText: 'Unresolved reference' });
	await expect(answer).toBeVisible();
	await expect(answer.locator('.receipts > summary')).toHaveText(
		'Evidence · 1 document · 41 excerpts'
	);
	await expect(answer.locator('.document-evidence')).not.toHaveAttribute('open');
	await expect(answer.locator('.inline-citation')).toHaveCount(3);
	await answer.screenshot({ path: '/tmp/receipt-citations-collapsed-desktop.png' });
	await expect(answer.locator('.answer-text img')).toHaveCount(0);
	await expect(answer.locator('.answer-text')).toContainText('[99]');
	const first = answer.getByRole('link', {
		name: 'Show evidence 1–3: Quarterly business review',
		exact: true
	});
	await first.focus();
	await page.keyboard.press('Enter');
	await expect(answer.locator('[data-receipt="1"]')).toBeFocused();
	await expect(answer.locator('.receipt-selected')).toHaveCount(3);
	await expect(answer.locator('.document-evidence')).toHaveAttribute('open');
	await expect(answer.locator('[data-receipt="2"] blockquote')).toHaveText(
		'Recorded observation 2 from Ana Duarte.'
	);
	await expect(answer.locator('[data-receipt="2"] .source-evidence-link')).toHaveAttribute(
		'href',
		'/source/transcripts%2Freview%23utterance-0002'
	);
	await answer.locator('.receipts > summary').click();
	await answer
		.getByRole('link', { name: 'Show evidence 41: Quarterly business review', exact: true })
		.click();
	await expect(answer.locator('[data-receipt="41"]')).toBeFocused();
	await expect(answer.locator('.receipts')).toHaveAttribute('open');
	await expect(answer.locator('.receipt-selected')).toHaveCount(1);
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
	await page.screenshot({ path: '/tmp/receipt-citations-expanded-mobile.png' });
	const accessibility = await new AxeBuilder({ page }).include('.answer-result').analyze();
	expect(
		accessibility.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))
	).toEqual([]);
	crossDocument = true;
	citations[40].sourceId = 'emails/decision#message-001';
	citations[40].title = 'Decision email';
	await page.locator('#question').fill('Show combined evidence');
	await page.getByRole('button', { name: 'Ask project question' }).click();
	await expect(answer.locator('.receipts > summary')).toHaveText(
		'Evidence · 2 documents · 41 excerpts'
	);
	await page.evaluate(() =>
		document.querySelectorAll('.answer-result details').forEach((d) => {
			(d as HTMLDetailsElement).open = false;
		})
	);
	await answer
		.getByRole('link', { name: 'Show evidence 1, 41: Quarterly business review', exact: true })
		.click();
	await expect(answer.locator('.document-evidence[open]')).toHaveCount(2);
	await expect(answer.locator('[data-receipt="1"]')).toBeFocused();
	await expect(answer.locator('.receipt-selected')).toHaveCount(2);
	await expect(answer.locator('[data-receipt="41"] .source-evidence-link')).toHaveAttribute(
		'href',
		'/source/emails%2Fdecision%23message-001'
	);
});
