import { test, expect } from '@playwright/test';

test('citizen and official complete a private streetlight complaint', async ({ browser }) => {
    const citizenContext = await browser.newContext();
    const officialContext = await browser.newContext();
    const citizen = await citizenContext.newPage();
    const official = await officialContext.newPage();
    const pageErrors = [];
    for (const page of [citizen, official]) page.on('pageerror', error => pageErrors.push(error.message));
    // Verify resilience when the optional map provider is unavailable.
    await citizen.route('**/nominatim.openstreetmap.org/**', route => route.abort());
    await citizen.route('**/tile.openstreetmap.org/**', route => route.abort());
    await official.route('**/tile.openstreetmap.org/**', route => route.abort());
    async function login(page, email, admin = false) {
        await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
        if (admin) await page.getByRole('button', { name: /Official/ }).click();
        await page.getByPlaceholder('name@example.com').fill(email);
        await page.locator('input[type="password"]').last().fill('Demo-password-2026!');
        if (admin) await page.getByPlaceholder('Enter your authority verification code').fill('demo-official-code');
        const response = page.waitForResponse(response => response.url().endsWith('/api/auth/login'), { timeout: 30000 });
        await page.getByRole('button', { name: /Sign In to Dashboard/ }).click();
        expect((await response).status()).toBe(200);
        await expect(page).toHaveURL(admin ? /\/admin$/ : /\/citizen$/, { timeout: 15000 });
    }
    try {
        await login(citizen, 'citizen@example.test');
        await citizen.getByText('Verify Aadhaar →').click();
        await citizen.getByPlaceholder('XXXX XXXX XXXX').fill('000000000001');
        await citizen.getByRole('button', { name: /Verify/, exact: false }).last().click();
        await expect(citizen.getByRole('button', { name: /New Complaint/ })).toBeEnabled();
        await citizen.getByRole('button', { name: /New Complaint/ }).click();
        await citizen.getByPlaceholder('e.g. Broken street light on MG Road').fill('Streetlight out at Demo Junction');
        await citizen.getByPlaceholder('Describe the issue in detail...').fill('Synthetic demo: streetlight beside the community library is not working.');
        await citizen.getByPlaceholder('Exact address (House no., Street, Area...)').fill('Demo Junction, Example Road, Hyderabad');
        await citizen.getByPlaceholder('City', { exact: true }).fill('Hyderabad');
        await citizen.getByPlaceholder('State', { exact: true }).fill('Telangana');
        await citizen.getByRole('button', { name: 'Choose a map pin (optional)' }).click();
        await citizen.getByLabel('Choose complaint location on map').click({ position: { x: 110, y: 110 } });
        await expect(citizen.getByLabel('Latitude')).not.toHaveValue('');
        await citizen.getByPlaceholder('City', { exact: true }).fill('Hyderabad');
        await citizen.screenshot({ path: 'test-results/complaint-form-desktop.png', fullPage: true });
        await citizen.setViewportSize({ width: 390, height: 844 });
        await citizen.screenshot({ path: 'test-results/complaint-form-mobile.png' });
        expect(await citizen.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await citizen.setViewportSize({ width: 1280, height: 720 });
        await citizen.getByRole('button', { name: /Submit Complaint/ }).click();
        const confirmation = citizen.getByRole('status').filter({ hasText: 'Complaint submitted' });
        await expect(confirmation).toBeVisible();
        const id = (await confirmation.innerText()).match(/CC-\d{4}-\d+/)[0];
        await confirmation.getByRole('button', { name: /Copy tracking ID/ }).click();
        await expect(confirmation).toContainText(/Copied|Select the ID/);
        const token = await citizen.evaluate(() => localStorage.getItem('token'));
        const savedReports = await citizen.request.get('http://localhost:5001/api/complaints/my', { headers: { Authorization: `Bearer ${token}` } });
        const filedReport = (await savedReports.json()).find(report => report.complaintId === id);
        expect(filedReport.lat).not.toBeNull();
        expect(filedReport.lng).not.toBeNull();

        const secondCitizenLogin = await citizen.request.post('http://localhost:5001/api/auth/login', { data: { email: 'other@example.test', password: 'Demo-password-2026!', role: 'citizen' } });
        const secondCitizenToken = (await secondCitizenLogin.json()).token;
        await citizen.request.post('http://localhost:5001/api/auth/verify-aadhaar', { headers: { Authorization: `Bearer ${secondCitizenToken}` }, data: { aadhaarNumber: '000000000002' } });
        const nearReport = await citizen.request.post('http://localhost:5001/api/complaints', {
            headers: { Authorization: `Bearer ${secondCitizenToken}` }, data: {
                title: 'Nearby public lighting report', description: 'Synthetic public report near the same location.',
                category: 'Infrastructure', location: 'Demo Junction, Example Road, Hyderabad', city: 'Hyderabad', state: 'Telangana',
                lat: filedReport.lat, lng: filedReport.lng, isPublic: true,
            },
        });
        expect(nearReport.status()).toBe(201);
        await citizen.getByRole('button', { name: /New Complaint/ }).click();
        await citizen.getByPlaceholder('e.g. Broken street light on MG Road').fill('Second streetlight report');
        await citizen.getByPlaceholder('Describe the issue in detail...').fill('Checking nearby duplicate suggestions.');
        await citizen.getByPlaceholder('Exact address (House no., Street, Area...)').fill('Demo Junction, Example Road, Hyderabad');
        await citizen.getByPlaceholder('City', { exact: true }).fill('Hyderabad');
        await citizen.getByPlaceholder('State', { exact: true }).fill('Telangana');
        await citizen.getByRole('button', { name: 'Choose a map pin (optional)' }).click();
        await citizen.getByLabel('Latitude').fill(String(filedReport.lat));
        await citizen.getByLabel('Longitude').fill(String(filedReport.lng));
        await expect(citizen.getByText('Possible matches within 300 m')).toBeVisible({ timeout: 15000 });
        await expect(citizen.getByText('Nearby public lighting report', { exact: true })).toBeVisible();
        await citizen.getByText('Nearby public lighting report', { exact: true }).locator('..').getByRole('button', { name: 'Follow progress' }).click();
        await expect(citizen.getByRole('button', { name: /Following/ })).toBeVisible();
        await citizen.getByRole('button', { name: 'Continue with a new report' }).click();
        await citizen.getByRole('button', { name: 'Cancel', exact: true }).click();
        await citizen.getByRole('heading', { name: 'Streetlight out at Demo Junction', exact: true }).click();
        await citizen.getByRole('button', { name: 'Edit complaint' }).click();
        await citizen.getByLabel('Complaint description').fill('Synthetic demo: streetlight beside the community library is not working. Corrected before staff assignment.');
        await citizen.getByRole('button', { name: 'Save changes' }).click();
        await expect(citizen.getByRole('status').filter({ hasText: 'Complaint updated.' })).toBeVisible();
        await login(official, 'official@example.test', true);
        await official.getByPlaceholder('Search by title, citizen, location, complaint ID...').fill(id);
        await official.getByText('Streetlight out at Demo Junction', { exact: true }).click();
        await official.getByRole('button', { name: /Thread/ }).click();
        await official.getByRole('button', { name: 'Open citizen chat' }).click();
        await official.getByPlaceholder('Type a message to citizen...').fill('Maintenance crew assigned.');
        await official.getByPlaceholder('Type a message to citizen...').press('Enter');
        await expect(official.getByText('Maintenance crew assigned.', { exact: true })).toBeVisible();
        await citizen.reload();
        await citizen.getByPlaceholder('Search tracking ID or title...').fill(id);
        await citizen.getByRole('button', { name: new RegExp(`Show ${id} on map`) }).click();
        await expect(citizen.locator('.leaflet-popup-content')).toContainText(id, { timeout: 15000 });
        await citizen.getByRole('heading', { name: 'Streetlight out at Demo Junction', exact: true }).last().click();
        await citizen.getByPlaceholder('Type a message to the official…').fill('Thank you. The lamp is beside the library.');
        await citizen.getByPlaceholder('Type a message to the official…').press('Enter');
        await expect(official.getByText('Thank you. The lamp is beside the library.', { exact: true })).toBeVisible({ timeout: 15000 });
        await official.getByRole('button', { name: /Update/, exact: false }).first().click();
        await official.getByRole('button', { name: 'Resolved', exact: true }).click();
        await official.getByRole('button', { name: /Save.*Notify|Save Changes/ }).click();
        await expect(official.getByRole('button', { name: 'Save Changes' })).toBeHidden();
        await official.screenshot({ path: 'test-results/official-desktop.png', fullPage: true });
        await citizen.reload();
        await citizen.locator('input').filter({ visible: true }).first().fill(id);
        await citizen.getByRole('heading', { name: 'Streetlight out at Demo Junction', exact: true }).last().click();
        await expect(citizen.getByText('Complaint Resolved', { exact: true })).toBeVisible();
        await citizen.getByRole('button', { name: /Rate This Resolution/ }).click();
        await citizen.getByRole('button', { name: 'Rate 5 stars' }).click();
        await citizen.getByRole('button', { name: 'Submit Rating' }).click();
        const tracked = await citizen.request.get(`http://localhost:5001/api/complaints/track/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        expect((await tracked.json()).rating).toBe(5);
        for (const page of [citizen, official]) {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.getByRole('heading', { name: page === citizen ? 'Your Complaints' : /Authority/ }).scrollIntoViewIfNeeded();
            if (page === citizen) {
                const panel = citizen.getByRole('heading', { name: 'Your Complaints' }).locator('xpath=ancestor::div[contains(@class,"glass-panel")][1]');
                await expect(panel).toHaveCSS('opacity', '1');
            }
            await page.screenshot({ path: `test-results/${page === citizen ? 'citizen' : 'official'}-mobile.png` });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        }
        const denied = await citizen.request.get(`http://localhost:5001/api/complaints/track/${id}`, { headers: { Authorization: `Bearer ${secondCitizenToken}` } });
        expect(denied.status()).toBe(403);
        await citizen.reload();
        await citizen.getByRole('heading', { name: 'Streetlight out at Demo Junction', exact: true }).last().click();
        await citizen.getByRole('button', { name: 'Share on public feed', exact: true }).click();
        await expect(citizen.getByRole('button', { name: 'Make private', exact: true })).toBeVisible();
        const sharedFeed = await citizen.request.get('http://localhost:5001/api/complaints');
        const publicRecord = (await sharedFeed.json()).find(complaint => complaint.complaintId === id);
        expect(publicRecord).toBeTruthy();
        expect(publicRecord.messages).toBeUndefined();
        await citizen.getByRole('button', { name: 'Make private', exact: true }).click();
        await expect(citizen.getByRole('button', { name: 'Share on public feed', exact: true })).toBeVisible();
        const privateFeed = await citizen.request.get('http://localhost:5001/api/complaints');
        expect((await privateFeed.json()).some(complaint => complaint.complaintId === id)).toBe(false);
        expect(pageErrors).toEqual([]);
    } finally { await citizenContext.close(); await officialContext.close(); }
});
