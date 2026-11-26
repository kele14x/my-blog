import { expect, test } from '@playwright/test';

const TOGGLE = '#theme-toggle';
const LIGHT_BG = 'rgb(255, 255, 255)';
const DARK_BG = 'rgb(20, 22, 28)';

/** background-color of <body> resolved by the browser. */
async function bodyBackground(page: import('@playwright/test').Page) {
	return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function expectTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
	await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
	await expect(page.locator('body')).toHaveCSS('background-color', theme === 'dark' ? DARK_BG : LIGHT_BG);
}

async function changeSystemTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
	await page.emulateMedia({ colorScheme: theme });
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

test.describe('auto selection on load', () => {
	test('picks light from a light system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
	});

	test('picks dark from a dark system preference', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await bodyBackground(page)).toBe(DARK_BG);
	});

	test('reacts to system preference changes until the user chooses', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.emulateMedia({ colorScheme: 'dark' });
		await expect.poll(() => bodyBackground(page)).toBe(DARK_BG);
	});

	test('keeps following system changes after internal navigation without storing a choice', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.getByRole('link', { name: 'Blog', exact: true }).click();
		await expect(page).toHaveURL(/\/blog\/?$/);
		await expectTheme(page, 'light');

		await changeSystemTheme(page, 'dark');
		await expectTheme(page, 'dark');
		await changeSystemTheme(page, 'light');
		await expectTheme(page, 'light');
		expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBeNull();
	});
});

test.describe('manual toggle', () => {
	test('flips between light and dark', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		const toggle = page.locator(TOGGLE);

		await toggle.click(); // dark -> light
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
		expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe('light');

		await toggle.click(); // light -> dark
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await bodyBackground(page)).toBe(DARK_BG);
		expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe('dark');

		await toggle.click(); // dark -> light again
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		expect(await bodyBackground(page)).toBe(LIGHT_BG);
		expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe('light');
	});

	for (const theme of ['light', 'dark'] as const) {
		const system = theme === 'dark' ? 'light' : 'dark';

		test(`${theme} choice survives reloads and ignores later system changes`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: system });
			await page.goto('/');
			await page.locator(TOGGLE).click();
			expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe(theme);

			for (const reload of [false, true]) {
				if (reload) await page.reload();
				await expectTheme(page, theme);
				await changeSystemTheme(page, theme);
				await changeSystemTheme(page, system);
				await expectTheme(page, theme);
				expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe(theme);
			}
		});

		test(`${theme} choice survives internal navigation and back/forward`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: system });
			await page.goto('/');
			await page.locator(TOGGLE).click();
			await expectTheme(page, theme);

			await page.getByRole('link', { name: 'Blog', exact: true }).click();
			await expect(page).toHaveURL(/\/blog\/?$/);
			await expectTheme(page, theme);

			await page.goBack();
			await expect(page).toHaveURL('/');
			await expectTheme(page, theme);

			await page.goForward();
			await expect(page).toHaveURL(/\/blog\/?$/);
			await expectTheme(page, theme);
			expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe(theme);
		});

		test(`${theme} choice is session-only; fresh tabs and contexts follow the system`, async ({ page, context, browser, baseURL }) => {
			await page.emulateMedia({ colorScheme: system });
			await page.goto('/');
			await page.locator(TOGGLE).click();
			await expectTheme(page, theme);

			const storage = await page.evaluate(() => ({
				theme: sessionStorage.getItem('theme'),
				local: localStorage.length,
			}));
			expect(storage).toEqual({ theme, local: 0 });
			expect(await context.cookies()).toEqual([]);

			const freshTab = await context.newPage();
			await freshTab.emulateMedia({ colorScheme: system });
			await freshTab.goto('/');
			await expectTheme(freshTab, system);
			expect(await freshTab.evaluate(() => sessionStorage.getItem('theme'))).toBeNull();
			await freshTab.close();

			const freshContext = await browser.newContext({ baseURL, colorScheme: system });
			try {
				const freshPage = await freshContext.newPage();
				await freshPage.goto('/');
				await expectTheme(freshPage, system);
				expect(await freshPage.evaluate(() => sessionStorage.getItem('theme'))).toBeNull();
			} finally {
				await freshContext.close();
			}
			await expectTheme(page, theme);
		});
	}
});

test.describe('session storage boundaries', () => {
	test('blocked storage still allows in-page toggles but cannot persist across reloads', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(window, 'sessionStorage', {
				get() {
					throw new DOMException('Storage blocked', 'SecurityError');
				},
			});
		});
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await expectTheme(page, 'dark');
		for (const theme of ['light', 'dark', 'light'] as const) {
			await page.locator(TOGGLE).click();
			await expectTheme(page, theme);
		}
		await changeSystemTheme(page, 'light');
		await changeSystemTheme(page, 'dark');
		await expectTheme(page, 'light');
		await page.reload();
		await expectTheme(page, 'dark');
	});

	test('invalid stored values are ignored until a valid choice is made', async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('theme', 'invalid'));
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/');
		await expectTheme(page, 'dark');
		await changeSystemTheme(page, 'light');
		await expectTheme(page, 'light');
		await page.locator(TOGGLE).click();
		await expectTheme(page, 'dark');
		expect(await page.evaluate(() => sessionStorage.getItem('theme'))).toBe('dark');
	});
});

test.describe('navbar divider', () => {
	for (const system of ['light', 'dark'] as const) {
		test(`uses solid dividers across theme changes with a ${system} system theme`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: system });
			await page.goto('/');
			const header = page.locator('header');
			const themes = [system, system === 'dark' ? 'light' : 'dark', system] as const;

			for (const [index, theme] of themes.entries()) {
				if (index > 0) await page.locator(TOGGLE).click();
				await expectTheme(page, theme);
				await expect(header).toHaveCSS('box-shadow', 'none');
				await expect(header).toHaveCSS('border-bottom',
					theme === 'dark' ? '1px solid rgb(52, 60, 78)' : '1px solid rgb(229, 233, 240)');
			}
		});
	}

	test.describe('without JavaScript', () => {
		test.use({ javaScriptEnabled: false });

		for (const system of ['light', 'dark'] as const) {
			test(`system ${system} fallback also uses a solid divider`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: system });
				await page.goto('/');
				await expect(page.locator('header')).toHaveCSS('box-shadow', 'none');
				await expect(page.locator('header')).toHaveCSS('border-bottom',
					system === 'dark' ? '1px solid rgb(52, 60, 78)' : '1px solid rgb(229, 233, 240)');
			});
		}
	});
});

test.describe('solid page backgrounds', () => {
	for (const path of ['/', '/blog/', '/blog/8b10b-encoding-en/']) {
		test(`body and footer stay solid across theme changes on ${path}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: 'dark' });
			await page.goto(path);

			for (const [index, background] of [DARK_BG, LIGHT_BG, DARK_BG].entries()) {
				if (index > 0) await page.locator(TOGGLE).click();
				for (const selector of ['body', 'footer']) {
					await expect(page.locator(selector)).toHaveCSS('background-image', 'none');
					await expect(page.locator(selector)).toHaveCSS('background-color', background);
				}
			}
		});
	}
});

test('dark theme keeps article text readable', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/blog/8b10b-encoding-en/');
	const heading = page.locator('.prose h1');
	await expect(heading).toHaveCSS('color', 'rgb(235, 238, 245)');
	// Code blocks keep their dark Shiki background on both themes.
	const pre = page.locator('pre.astro-code').first();
	await expect(pre).toHaveCSS('background-color', 'rgb(36, 41, 46)');
});

test('section numbers stay dimmer than the heading text in both themes', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/blog/8b10b-encoding-en/');
	const section = page.locator('.prose h2').first();
	const number = section.locator('.heading-number');
	await expect(number).toHaveText('1 ');
	for (const [theme, headingColor, numberColor] of [
		['light', 'rgb(15, 18, 25)', 'rgb(96, 115, 159)'],
		['dark', 'rgb(235, 238, 245)', 'rgb(148, 160, 185)'],
	] as const) {
		if (theme === 'dark') await page.locator(TOGGLE).click();
		await expectTheme(page, theme);
		await expect(section).toHaveCSS('color', headingColor);
		await expect(number).toHaveCSS('color', numberColor);
	}
});