import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

test('guest feed recovers and account preferences and profile persist', async ({ page, request }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let failFeed = true;
    await page.route('**/api/complaints', route => failFeed
        ? route.fulfill({ status: 503, json: { message: 'Temporary demo outage' } })
        : route.continue());
    await page.goto('/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.getByRole('alert')).toContainText('Temporary demo outage', { timeout: 30000 });
    failFeed = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByPlaceholder('Search complaints by title, location...')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    const response = await request.post('http://localhost:5001/api/auth/register', {
        data: { name: 'Preferences Demo', email: `preferences-${randomUUID()}@example.test`, password: 'Demo-password-2026!', role: 'citizen' },
    });
    expect(response.status()).toBe(201);
    const { token } = await response.json();
    await page.evaluate(token => localStorage.setItem('token', token), token);
    await page.goto('/settings');
    const toggle = page.getByRole('switch', { name: 'Email notifications' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Display name').fill('Updated Portfolio Citizen');
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByText('Updated Portfolio Citizen').first()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Updated Portfolio Citizen').first()).toBeVisible();
    const savedArea = await request.put('http://localhost:5001/api/auth/preferences', {
        headers: { Authorization: `Bearer ${token}` }, data: { selectedArea: { city: 'Hyderabad', state: 'Telangana' } },
    });
    expect(savedArea.status()).toBe(200);
    await page.goto('/feed');
    const areaFilter = page.getByLabel('Filter public complaints by area');
    await expect(areaFilter.locator('option:checked')).toHaveText('Hyderabad, Telangana');
    await page.reload();
    await expect(areaFilter.locator('option:checked')).toHaveText('Hyderabad, Telangana');
    const localReports = await request.get('http://localhost:5001/api/complaints?city=Hyderabad&state=Telangana');
    expect((await localReports.json()).every(report => report.city?.toLowerCase() === 'hyderabad' && report.state?.toLowerCase() === 'telangana')).toBeTruthy();
    const capabilities = await request.get('http://localhost:5001/api/capabilities');
    if ((await capabilities.json()).uploads) {
        await page.goto('/profile', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Choose a profile photo' }).click();
        await page.locator('input[type="file"]').setInputFiles({
            name: 'synthetic-avatar.png', mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZsAAAAASUVORK5CYII=', 'base64'),
        });
        await expect(page.getByText('Profile photo saved to your account')).toBeVisible({ timeout: 30000 });
        const photo = page.locator('img[alt="avatar"]');
        await expect(photo).toBeVisible();
        const photoUrl = await photo.getAttribute('src');
        const secondContext = await page.context().browser().newContext();
        await secondContext.addInitScript(value => localStorage.setItem('token', value), token);
        const secondSession = await secondContext.newPage();
        await secondSession.goto('/profile');
        await expect(secondSession.locator('img[alt="avatar"]')).toHaveAttribute('src', photoUrl, { timeout: 30000 });
        await expect(secondSession.locator('img[alt="avatar"]')).toBeVisible();
        await secondContext.close();
        await page.getByRole('button', { name: 'Remove photo' }).click();
        await expect(page.getByText('Profile photo removed')).toBeVisible();
    }
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Security', exact: true }).click();
    await page.getByLabel('Current Password', { exact: true }).pressSequentially('typing-keeps-focus');
    await expect(page.getByLabel('Current Password', { exact: true })).toHaveValue('typing-keeps-focus');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(errors).toEqual([]);
});
