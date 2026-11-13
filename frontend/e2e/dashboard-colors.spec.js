import { test, expect } from '@playwright/test';
import process from 'node:process';

test('dashboard text remains readable for both roles at desktop and mobile widths', async ({ browser, request }) => {
    test.setTimeout(360000);
    const before = process.env.CAPTURE_COLOR_BASELINE === '1';
    for (const role of ['citizen', 'admin']) {
        const response = await request.post('http://localhost:5001/api/auth/login', { data: {
            email: role === 'admin' ? 'official@example.test' : 'citizen@example.test',
            password: 'Demo-password-2026!', role, ...(role === 'admin' ? { adminSecretCode: 'demo-official-code' } : {}),
        } });
        expect(response.status()).toBe(200);
        const { token } = await response.json();
        const context = await browser.newContext();
        await context.addInitScript(token => localStorage.setItem('token', token), token);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/tile.openstreetmap.org/**', route => route.abort());
        for (const width of [1280, 390]) {
            await page.setViewportSize({ width, height: 900 });
            for (const route of ['settings', 'profile', 'feed', role === 'admin' ? 'admin' : 'citizen']) {
                await page.goto(`/${route}`, { waitUntil: 'networkidle' });
                const content = route === 'admin' ? page.locator('#root > div') : page.locator('main');
                await expect(content).toBeVisible({ timeout: 15000 });
                await page.waitForTimeout(1000); // settle existing entrance animations for visual comparison
                const blackText = await content.evaluate(main => [...main.querySelectorAll('*')]
                    // Leaflet deliberately uses black glyphs on its white zoom controls.
                    .filter(el => !el.closest('.leaflet-control-zoom') && el.childElementCount === 0 && el.textContent.trim() && el.getBoundingClientRect().width && getComputedStyle(el).color === 'rgb(0, 0, 0)')
                    .map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 80) })));
                if (before) console.log(`${role}/${route}/${width}: ${JSON.stringify(blackText)}`);
                else {
                    expect(blackText, `${role}/${route}/${width} inherited black text`).toEqual([]);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
                    if (route === 'settings') {
                        for (const heading of await page.locator('main h1, main h2').all()) await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)');
                        for (const value of await page.locator('main dd').all()) await expect(value).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
                    }
                }
                await page.screenshot({ path: `test-results/colors-${before ? 'before' : 'after'}-${role}-${route}-${width}.png`, fullPage: true });
            }
        }
        expect(errors).toEqual([]);
        await context.close();
    }
});
