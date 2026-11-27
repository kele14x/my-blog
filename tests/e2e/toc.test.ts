import { expect, test } from '@playwright/test';

test.describe('table of contents', () => {
	test('sits beside the article and links to real sections', async ({ page }) => {
		await page.goto('/blog/8b10b-encoding-en/');

		const toc = page.locator('nav.toc');
		await expect(toc).toBeVisible();

		// Right of the centered prose column, not overlapping it.
		const boxes = await page.evaluate(() => {
			const toc = document.querySelector('nav.toc')!.getBoundingClientRect();
			const prose = document.querySelector('.prose')!.getBoundingClientRect();
			return { tocLeft: toc.left, proseRight: prose.right };
		});
		expect(boxes.tocLeft).toBeGreaterThanOrEqual(boxes.proseRight);

		// Every link points at an existing heading anchor. Heading ids start
		// with the section number, so match them as attribute values.
		const hrefs = await toc.locator('a').evaluateAll((links) =>
			links.map((link) => link.getAttribute('href')!),
		);
		expect(hrefs.length).toBeGreaterThan(5);
		for (const href of hrefs) {
			const id = decodeURIComponent(href.slice(1));
			await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
		}
	});

	test('article and panel read as a centered group', async ({ page }) => {
		await page.goto('/blog/8b10b-encoding-en/');

		const geometry = await page.evaluate(() => {
			const toc = document.querySelector('nav.toc')!.getBoundingClientRect();
			const prose = document.querySelector('.prose')!.getBoundingClientRect();
			return {
				leftGap: prose.left,
				rightGap: document.documentElement.clientWidth - toc.right,
				tocLeft: toc.left,
				proseRight: prose.right,
			};
		});
		// Panel sits right of the article without overlapping it.
		expect(geometry.tocLeft).toBeGreaterThanOrEqual(geometry.proseRight);
		// Blank space on the left matches the space right of the panel.
		expect(Math.abs(geometry.leftGap - geometry.rightGap)).toBeLessThanOrEqual(2);
	});

	test('uses a Chinese label on Chinese posts', async ({ page }) => {
		await page.goto('/blog/12-coins-game/');
		await expect(page.locator('nav.toc h2')).toHaveText('目录');
	});

	test('clicking an entry jumps to that section', async ({ page }) => {
		await page.goto('/blog/8b10b-encoding-en/');

		const link = page.locator('nav.toc a[href="#5-the-decoder"]');
		await link.click();
		await page.waitForFunction(() => window.scrollY > 0);

		const headingTop = await page
			.locator('[id="5-the-decoder"]')
			.evaluate((el) => el.getBoundingClientRect().top);
		expect(headingTop).toBeGreaterThanOrEqual(0);
		expect(headingTop).toBeLessThan(120);
		expect(page.url()).toContain('#5-the-decoder');
	});

	test('highlights the section being read while scrolling', async ({ page }) => {
		await page.goto('/blog/8b10b-encoding-en/');

		const current = page.locator('nav.toc a[aria-current="location"]');
		await expect(current).toHaveAttribute('href', '#1-starting-with-uart-and-spi');

		await page.locator('[id="6-a-real-application-cpri"]').evaluate((el) => el.scrollIntoView());
		await expect(current).toHaveAttribute('href', '#6-a-real-application-cpri');

		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(current).toHaveAttribute('href', '#1-starting-with-uart-and-spi');
	});

	test('the side panel stays visible while scrolling', async ({ page }) => {
		await page.goto('/blog/8b10b-encoding-en/');

		await page.locator('[id="6-a-real-application-cpri"]').evaluate((el) => el.scrollIntoView());
		const toc = page.locator('nav.toc');
		await expect(toc).toBeInViewport();
		const top = await toc.evaluate((el) => el.getBoundingClientRect().top);
		expect(top).toBeGreaterThanOrEqual(0);
		expect(top).toBeLessThan(200);
	});

	test('hidden on narrow screens without overflowing the page', async ({ page }) => {
		await page.setViewportSize({ width: 800, height: 900 });
		await page.goto('/blog/8b10b-encoding-en/');

		await expect(page.locator('nav.toc')).toBeHidden();
		const widths = await page.evaluate(() => ({
			scroll: document.documentElement.scrollWidth,
			client: document.documentElement.clientWidth,
		}));
		expect(widths.scroll).toBeLessThanOrEqual(widths.client);
	});

	test('narrow screens get a floating button that opens the outline anywhere', async ({ page }) => {
		await page.setViewportSize({ width: 800, height: 900 });
		await page.goto('/blog/8b10b-encoding-en/');

		const toggle = page.locator('button.toc-toggle');
		const popup = page.locator('#toc-popup');
		await expect(toggle).toBeVisible();
		await expect(popup).toBeHidden();

		// Scroll deep into the article: the button stays reachable.
		await page.locator('[id="6-a-real-application-cpri"]').evaluate((el) => el.scrollIntoView());
		await expect(toggle).toBeInViewport();

		await toggle.click();
		await expect(popup).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');

		await popup.locator('a[href="#5-the-decoder"]').click();
		// The popup closes after the jump.
		await expect(popup).toBeHidden();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(page).toHaveURL(/#5-the-decoder$/);
		await page.waitForFunction(() => {
			const top = document.getElementById('5-the-decoder')!.getBoundingClientRect().top;
			return top >= 0 && top < 120;
		});
	});

	for (const width of [320, 375]) {
		test(`the popup stays inside a ${width}px viewport`, async ({ page }) => {
			await page.setViewportSize({ width, height: 700 });
			await page.goto('/blog/8b10b-encoding-en/');

			await page.locator('button.toc-toggle').click();
			const popup = page.locator('#toc-popup');
			await expect(popup).toBeVisible();
			await expect(popup).toBeInViewport({ ratio: 1 });
		});
	}

	test('the popup closes on Escape and the button hides on wide screens', async ({ page }) => {
		await page.setViewportSize({ width: 800, height: 900 });
		await page.goto('/blog/8b10b-encoding-en/');

		const toggle = page.locator('button.toc-toggle');
		const popup = page.locator('#toc-popup');
		await toggle.click();
		await expect(popup).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(popup).toBeHidden();

		await page.setViewportSize({ width: 1440, height: 900 });
		await expect(toggle).toBeHidden();
		await expect(page.locator('nav.toc')).toBeVisible();
	});
});