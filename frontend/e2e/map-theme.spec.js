import { test, expect } from '@playwright/test';

test('map appearance persists across settings, dashboards and reloads for each role', async ({ browser, request }) => {
    test.setTimeout(240000);
    for (const role of ['citizen', 'admin']) {
        const login = await request.post('http://localhost:5001/api/auth/login', { data: {
            email: role === 'admin' ? 'official@example.test' : 'citizen@example.test', password: 'Demo-password-2026!', role,
            ...(role === 'admin' ? { adminSecretCode: 'demo-official-code' } : {}),
        } });
        expect(login.status()).toBe(200);
        const { token } = await login.json();
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.addInitScript(token => localStorage.setItem('token', token), token);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/settings');
        await page.getByRole('button', { name: 'Dark map', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Dark map', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.reload();
        await expect(page.getByRole('button', { name: 'Dark map', exact: true })).toHaveAttribute('aria-pressed', 'true');
        for (const width of [1280, 390]) {
            await page.setViewportSize({ width, height: 900 });
            await page.screenshot({ path: `test-results/settings-theme-${role}-${width}.png`, fullPage: true });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        }
        await page.goto(role === 'admin' ? '/admin?tab=analytics' : '/citizen');
        const tiles = page.locator('.civic-basemap-tiles');
        await expect(tiles).toBeAttached({ timeout: 20000 });
        await expect(tiles).toHaveCSS('filter', /invert\(1\)/);
        await expect(page.locator('.leaflet-marker-pane')).toHaveCSS('filter', 'none');
        await page.locator('[data-map-theme]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `test-results/map-dark-${role}-390.png`, fullPage: true });
        await page.getByRole('button', { name: 'Light map', exact: true }).click();
        await expect(tiles).toHaveCSS('filter', 'none');
        await page.reload();
        await expect(page.getByRole('button', { name: 'Light map', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.goto('/settings');
        await expect(page.getByRole('button', { name: 'Light map', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.route('**/api/auth/preferences', route => route.fulfill({ status: 503, json: { message: 'Temporary preference outage' } }));
        await page.getByRole('button', { name: 'Dark map', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('Temporary preference outage');
        await expect(page.getByRole('button', { name: 'Light map', exact: true })).toHaveAttribute('aria-pressed', 'true');
        expect(errors).toEqual([]);
        await context.close();
    }
});
