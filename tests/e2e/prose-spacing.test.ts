import { expect, test } from '@playwright/test';

const ARTICLES = [
	'/blog/12-coins-game/',
	'/blog/12-coins-game-en/',
	'/blog/8b10b-encoding/',
	'/blog/8b10b-encoding-en/',
	'/blog/systemverilog-variable-and-net/',
	'/blog/systemverilog-variable-and-net-en/',
];

/** 16px root font-size × 1rem, the gap every prose block should leave below it. */
const BODY_GAP = 16;
/** Headings sit further from the preceding block so a section break reads as a break. */
const HEADING_GAP = 40;

interface Gap {
	from: string;
	to: string;
	gap: number;
}

/** Measure the rendered space between each pair of adjacent top-level prose blocks. */
async function measureGaps(page: import('@playwright/test').Page): Promise<Gap[]> {
	return page.evaluate(() => {
		const prose = document.querySelector('.prose');
		if (!prose) return [];

		const blocks = Array.from(prose.children).filter(
			(el) => el.tagName !== 'SCRIPT' && el.getBoundingClientRect().height > 0,
		);

		const name = (el: Element) => {
			const tag = el.tagName.toLowerCase();
			if (el.classList.contains('katex-display')) return 'math';
			if (tag === 'div' && el.querySelector('table')) return 'table';
			if (tag === 'coins-game') return 'game';
			if (el.classList.contains('title')) return 'title';
			return tag;
		};

		const gaps: Gap[] = [];
		for (let i = 1; i < blocks.length; i++) {
			const previous = blocks[i - 1].getBoundingClientRect();
			const current = blocks[i].getBoundingClientRect();
			gaps.push({
				from: name(blocks[i - 1]),
				to: name(blocks[i]),
				gap: Math.round((current.top - previous.bottom) * 10) / 10,
			});
		}
		return gaps;
	});
}

for (const path of ARTICLES) {
	test.describe(path, () => {
		test('every top-level block leaves the same gap below it', async ({ page }) => {
			await page.goto(path);

			const gaps = await measureGaps(page);
			expect(gaps.length, 'expected a rendered article with multiple blocks').toBeGreaterThan(10);

			const offenders = gaps.filter(
				({ to, gap }) => !to.startsWith('h') && to !== 'title' && gap !== BODY_GAP,
			);
			expect(offenders, 'inconsistent spacing below these blocks').toEqual([]);
		});

		test('headings get extra space above and stay tight below', async ({ page }) => {
			await page.goto(path);

			const gaps = await measureGaps(page);

			const above = gaps.filter(({ to }) => to.startsWith('h'));
			expect(above.length, 'expected the article to contain headings').toBeGreaterThan(0);
			expect(above.filter(({ gap }) => gap !== HEADING_GAP)).toEqual([]);

			// A heading should never sit further from its own text than a paragraph does.
			const below = gaps.filter(({ from }) => from.startsWith('h'));
			expect(below.filter(({ gap }) => gap !== BODY_GAP)).toEqual([]);
		});

		test('no two blocks collide', async ({ page }) => {
			await page.goto(path);

			const gaps = await measureGaps(page);
			// The original bug: a collapsed <details> left 0px before the next heading.
			expect(gaps.filter(({ gap }) => gap < BODY_GAP).map(({ from, to, gap }) => `${from}->${to} ${gap}px}`)).toEqual([]);
		});

		test('no horizontal overflow', async ({ page }) => {
			await page.goto(path);

			const widths = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				client: document.documentElement.clientWidth,
			}));
			expect(widths.scroll).toBeLessThanOrEqual(widths.client);
		});
	});
}

test('display math renders as a block', async ({ page }) => {
	await page.goto('/blog/12-coins-game/');

	const display = page.locator('.katex-display').first();
	await expect(display).toHaveCSS('display', 'block');
});

test('collapsible tables can be expanded and hold their content', async ({ page }) => {
	await page.goto('/blog/8b10b-encoding/');

	const details = page.locator('.prose > details:has(table)').first();
	const summary = details.locator('summary');
	await expect(summary).toBeVisible();

	await summary.click();
	await expect(details).toHaveAttribute('open', '');

	const table = details.locator('table');
	await expect(table).toBeVisible();
	const box = await table.boundingBox();
	expect(box && box.height).toBeGreaterThan(0);
});
