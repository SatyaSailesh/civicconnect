import { test, expect } from '@playwright/test';

test('officials can filter withdrawn complaints without changing case history', async ({ browser, request }) => {
    const citizenLogin = await request.post('http://localhost:5001/api/auth/login', { data: {
        email: 'citizen@example.test', password: 'Demo-password-2026!', role: 'citizen',
    } });
    expect(citizenLogin.status()).toBe(200);
    const citizenToken = (await citizenLogin.json()).token;
    const verification = await request.post('http://localhost:5001/api/auth/verify-aadhaar', {
        headers: { Authorization: `Bearer ${citizenToken}` }, data: { aadhaarNumber: '000000000001' },
    });
    expect(verification.status()).toBe(200);
    const filed = await request.post('http://localhost:5001/api/complaints', {
        headers: { Authorization: `Bearer ${citizenToken}` }, data: {
            title: 'Synthetic withdrawn workflow case', description: 'Local browser regression fixture.',
            category: 'Infrastructure', location: 'Demo Junction',
        },
    });
    expect(filed.status()).toBe(201);
    const complaint = await filed.json();
    const correctionRequest = await request.post(`http://localhost:5001/api/complaints/${complaint._id}/corrections`, {
        headers: { Authorization: `Bearer ${citizenToken}` }, data: { message: 'Correction requested before withdrawal.', version: complaint.__v },
    });
    expect(correctionRequest.status()).toBe(201);
    const correctionUpdated = await correctionRequest.json();
    const withdrawn = await request.post(`http://localhost:5001/api/complaints/${complaint._id}/withdraw`, {
        headers: { Authorization: `Bearer ${citizenToken}` }, data: { version: correctionUpdated.__v },
    });
    expect(withdrawn.status()).toBe(200);
    const savedHistory = (await withdrawn.json()).history;

    const officialLogin = await request.post('http://localhost:5001/api/auth/login', { data: {
        email: 'official@example.test', password: 'Demo-password-2026!', role: 'admin', adminSecretCode: 'demo-official-code',
    } });
    expect(officialLogin.status()).toBe(200);
    const officialToken = (await officialLogin.json()).token;
    const officialContext = await browser.newContext();
    await officialContext.addInitScript(token => localStorage.setItem('token', token), officialToken);
    const officialPage = await officialContext.newPage();
    const pageErrors = [];
    officialPage.on('pageerror', error => pageErrors.push(error.message));
    try {
        await officialPage.goto('/admin', { waitUntil: 'domcontentloaded' });
        await officialPage.getByLabel('Filter complaints by status').selectOption('Withdrawn');
        await expect(officialPage.getByRole('button', { name: 'Synthetic withdrawn workflow case' })).toBeVisible();
        await officialPage.getByRole('button', { name: 'Synthetic withdrawn workflow case' }).click();
        await expect(officialPage.getByRole('status', { name: 'Withdrawn complaint' })).toContainText('history retained');
        await expect(officialPage.getByRole('button', { name: 'Approve request' })).toBeDisabled();
        await officialPage.getByRole('button', { name: /Thread/ }).click();
        await expect(officialPage.getByRole('button', { name: /Open citizen chat/ })).toBeDisabled();
        const current = await request.get(`http://localhost:5001/api/complaints/${complaint._id}`, {
            headers: { Authorization: `Bearer ${officialToken}` },
        });
        expect(current.status()).toBe(200);
        expect((await current.json()).history).toEqual(savedHistory);
        expect(pageErrors).toEqual([]);
    } finally { await officialContext.close(); }
});
