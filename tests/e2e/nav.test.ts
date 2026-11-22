import { expect, test } from '@playwright/test';

const LINKS = '.internal-links a';

async function navRects(page: import('@playwright/test').Page) {
	return page.locator(LINKS).evaluateAll((links) =>
		links.map((a) => {
			const r = a.getBoundingClientRect();
			return { x: r.x, width: r.width };
		}),
	);
}

test('active nav link does not shift the nav bar', async ({ page }) => {
	await page.goto('/');
	const home = await navRects(page);

	await page.getByRole('link', { name: 'Blog', exact: true }).click();
	await expect(page.locator('.internal-links a.active')).toHaveText('Blog');
	expect(await navRects(page)).toEqual(home);

	await page.getByRole('link', { name: 'Home', exact: true }).click();
	await expect(page.locator('.internal-links a.active')).toHaveText('Home');
	expect(await navRects(page)).toEqual(home);
});
