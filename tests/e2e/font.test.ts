import { expect, test } from '@playwright/test';

const TOGGLE = '#font-toggle';

async function expectFont(page: import('@playwright/test').Page, font: 'sans' | 'serif') {
	await expect(page.locator('html')).toHaveAttribute('data-font', font);
	const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
	if (font === 'serif') {
		expect(family).toContain('Georgia');
	} else {
		expect(family).not.toContain('Georgia');
		expect(family.toLowerCase()).toContain('atkinson');
	}
}

test('defaults to sans with no stored choice', async ({ page }) => {
	await page.goto('/');
	await expectFont(page, 'sans');
	expect(await page.evaluate(() => sessionStorage.getItem('font'))).toBeNull();
});

test('flips between sans and serif and stores the choice', async ({ page }) => {
	await page.goto('/');
	const toggle = page.locator(TOGGLE);

	await toggle.click(); // sans -> serif
	await expectFont(page, 'serif');
	expect(await page.evaluate(() => sessionStorage.getItem('font'))).toBe('serif');

	await toggle.click(); // serif -> sans
	await expectFont(page, 'sans');
	expect(await page.evaluate(() => sessionStorage.getItem('font'))).toBe('sans');
});

test('button label reflects the font you would switch to', async ({ page }) => {
	await page.goto('/');
	const toggle = page.locator(TOGGLE);
	await expect(toggle).toHaveAttribute('aria-label', 'Switch to serif font');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-label', 'Switch to sans-serif font');
});

test('serif choice survives reloads, navigation and back/forward', async ({ page }) => {
	await page.goto('/');
	await page.locator(TOGGLE).click();
	await expectFont(page, 'serif');

	await page.reload();
	await expectFont(page, 'serif');

	await page.getByRole('link', { name: 'Blog', exact: true }).click();
	await expect(page).toHaveURL(/\/blog\/?$/);
	await expectFont(page, 'serif');

	await page.goBack();
	await expect(page).toHaveURL('/');
	await expectFont(page, 'serif');

	await page.goForward();
	await expect(page).toHaveURL(/\/blog\/?$/);
	await expectFont(page, 'serif');
	expect(await page.evaluate(() => sessionStorage.getItem('font'))).toBe('serif');
});

test('choice is session-only; fresh tabs and contexts start with sans', async ({ page, context, browser, baseURL }) => {
	await page.goto('/');
	await page.locator(TOGGLE).click();
	await expectFont(page, 'serif');

	const storage = await page.evaluate(() => ({
		font: sessionStorage.getItem('font'),
		local: localStorage.length,
	}));
	expect(storage).toEqual({ font: 'serif', local: 0 });
	expect(await context.cookies()).toEqual([]);

	const freshTab = await context.newPage();
	await freshTab.goto('/');
	await expectFont(freshTab, 'sans');
	expect(await freshTab.evaluate(() => sessionStorage.getItem('font'))).toBeNull();
	await freshTab.close();

	const freshContext = await browser.newContext({ baseURL });
	try {
		const freshPage = await freshContext.newPage();
		await freshPage.goto('/');
		await expectFont(freshPage, 'sans');
		expect(await freshPage.evaluate(() => sessionStorage.getItem('font'))).toBeNull();
	} finally {
		await freshContext.close();
	}
	await expectFont(page, 'serif');
});

test('blocked storage still allows in-page toggles but cannot persist across reloads', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'sessionStorage', {
			get() {
				throw new DOMException('Storage blocked', 'SecurityError');
			},
		});
	});
	await page.goto('/');
	await expectFont(page, 'sans');
	for (const font of ['serif', 'sans', 'serif'] as const) {
		await page.locator(TOGGLE).click();
		await expectFont(page, font);
	}
	await page.reload();
	await expectFont(page, 'sans');
});

test('invalid stored values are ignored until a valid choice is made', async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem('font', 'invalid'));
	await page.goto('/');
	await expectFont(page, 'sans');
	await page.locator(TOGGLE).click();
	await expectFont(page, 'serif');
	expect(await page.evaluate(() => sessionStorage.getItem('font'))).toBe('serif');
});

test('font toggle is independent of the theme toggle', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');
	await page.locator(TOGGLE).click();
	await page.locator('#theme-toggle').click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expectFont(page, 'serif');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expectFont(page, 'serif');
});

test('article code keeps its monospace font while prose switches to serif', async ({ page }) => {
	await page.goto('/blog/8b10b-encoding-en/');
	await page.locator(TOGGLE).click();
	await expectFont(page, 'serif');
	const prose = page.locator('.prose p').first();
	expect(await prose.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Georgia');
	const pre = page.locator('pre.astro-code').first();
	expect(await pre.evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase())).toContain('mono');
});
