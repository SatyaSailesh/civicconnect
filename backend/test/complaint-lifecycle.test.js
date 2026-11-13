const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { test } = require("node:test");
const mongoose = require("mongoose");
const { Readable, Writable } = require('node:stream');
const { escapeHtml } = require('../services/html');
const { createCloudinaryStorage } = require('../services/cloudinaryStorage');

const backendDir = path.resolve(__dirname, "..");
const citizenEmail = "citizen@example.test";
const officialEmail = "official@example.test";
const demoCode = "000000000001";
const password = "Demo-test-password";
const adminSecretCode = "test-only-official-code";

test("user supplied email content is escaped before HTML rendering", () => {
    assert.equal(escapeHtml(`<img src=x onerror='alert("x")'>&`), '&lt;img src=x onerror=&#39;alert(&quot;x&quot;)&#39;&gt;&amp;');
});

test("complaint uploads use fixed Cloudinary options and return Multer file metadata", async () => {
    let receivedOptions;
    let removedId;
    const storage = createCloudinaryStorage({ uploader: {
        upload_stream(options, callback) {
            receivedOptions = options;
            return new Writable({ write(_chunk, _encoding, done) { done(); }, final(done) {
                callback(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/demo.jpg', public_id: 'civicconnect/complaints/demo', bytes: 7 });
                done();
            } });
        },
        destroy(publicId) { removedId = publicId; return Promise.resolve({ result: 'ok' }); },
    } });
    const result = await new Promise((resolve, reject) => storage._handleFile({}, {
        stream: Readable.from(['synthetic']), mimetype: 'image/jpeg',
    }, (error, file) => error ? reject(error) : resolve(file)));
    assert.equal(result.path, 'https://res.cloudinary.com/demo/image/upload/demo.jpg');
    assert.equal(result.filename, 'civicconnect/complaints/demo');
    assert.equal(result.mimetype, 'image/jpeg');
    assert.equal(receivedOptions.folder, 'civicconnect/complaints');
    assert.deepEqual(receivedOptions.allowed_formats, ['jpg', 'jpeg', 'png', 'webp']);
    await new Promise((resolve, reject) => storage._removeFile({}, result, error => error ? reject(error) : resolve()));
    assert.equal(removedId, result.filename);
});

test("citizen files a complaint and an approved official resolves it", { timeout: 60000 }, async t => {
    const mongoPort = process.env.TEST_MONGO_PORT || "27017";
    assert.match(mongoPort, /^\d+$/);
    const database = `civicconnect_test_${randomUUID().replaceAll("-", "")}`;
    const env = {
        ...process.env,
        MONGO_URI: `mongodb://127.0.0.1:${mongoPort}/${database}`,
        PORT: "0",
        JWT_SECRET: randomUUID(),
        ADMIN_WHITELIST: officialEmail,
        ADMIN_SECRET_CODE: adminSecretCode,
        AADHAAR_WHITELIST: `${citizenEmail}:${demoCode}`,
        DEPARTMENT_ROUTING_JSON: JSON.stringify([
            { category: 'Infrastructure', city: 'DemoCity', state: 'TestState', department: 'Synthetic Public Works', jurisdiction: 'Synthetic Ward', verified: true },
            { category: 'Public Service', city: 'DemoCity', state: 'TestState', department: 'Demo Services', jurisdiction: 'Demo Ward', demo: true },
        ]),
        CLOUDINARY_CLOUD_NAME: "",
        CLOUDINARY_API_KEY: "",
        CLOUDINARY_API_SECRET: "",
        EMAIL_USER: "",
        EMAIL_PASS: "",
    };

    const server = spawn(process.execPath, ["server.js"], { cwd: backendDir, env });
    const exited = once(server, "exit");
    let output = "";
    server.stdout.on("data", chunk => { output += chunk; });
    server.stderr.on("data", chunk => { output += chunk; });

    t.after(async () => {
        server.kill();
        await exited;
        const connection = mongoose.createConnection(env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
        try {
            await connection.asPromise();
            await connection.dropDatabase();
        } finally {
            await connection.close();
        }
    });

    let port;
    for (let attempt = 0; attempt < 150 && !port && server.exitCode === null; attempt++) {
        port = output.match(/Server on port (\d+)/)?.[1];
        if (!port) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(port, `API did not start. Start local MongoDB on port ${mongoPort}.\n${output}`);

    async function request(route, expectedStatus, { method = "GET", token, body } = {}) {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        if (body && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(body);
        }
        const response = await fetch(`http://127.0.0.1:${port}/api${route}`, {
            method, headers, body, signal: AbortSignal.timeout(5000),
        });
        const data = await response.text();
        assert.equal(response.status, expectedStatus, `${method} ${route}: ${data}`);
        return response.headers.get("content-type")?.includes("application/json") ? JSON.parse(data) : data;
    }

    const post = (route, status, body, token) => request(route, status, { method: "POST", body, token });
    const citizen = { name: "Demo Citizen", email: citizenEmail, password, role: "citizen" };
    const official = { name: "Demo Official", email: officialEmail, password, role: "admin", adminSecretCode };
    const { token } = await post("/auth/register", 201, citizen);
    const { token: otherToken } = await post("/auth/register", 201, { ...citizen, email: "other@example.test" });

    await post("/auth/register", 403, { ...official, email: "unauthorized@example.test" });
    assert.equal((await post("/auth/register", 201, official)).pendingApproval, true);
    await post("/auth/login", 403, official);
    await post("/auth/admin/self-approve", 404, official);
    execFileSync(process.execPath, ["scripts/approve-admin.js", officialEmail], { cwd: backendDir, env, timeout: 10000 });
    const { token: officialToken } = await post("/auth/login", 200, official);
    await post("/auth/verify-aadhaar", 403, { aadhaarNumber: demoCode }, officialToken);
    assert.ok((await post("/auth/login", 200, citizen)).token);
    const capabilities = await request('/capabilities', 200);
    assert.equal(capabilities.uploads, false);
    assert.equal(capabilities.email, false);
    await request('/auth/preferences', 400, { method: 'PUT', token, body: { emailNotifications: 'false' } });
    const preferences = await request('/auth/preferences', 200, { method: 'PUT', token, body: { emailNotifications: false, role: 'admin', isApproved: true } });
    assert.equal(preferences.user.emailNotifications, false);
    assert.equal(preferences.user.role, 'citizen');
    await request('/auth/preferences', 400, { method: 'PUT', token, body: { mapTheme: 'invalid' } });
    await request('/auth/preferences', 400, { method: 'PUT', token, body: {} });
    const themed = await request('/auth/preferences', 200, { method: 'PUT', token, body: { mapTheme: 'dark', role: 'admin' } });
    assert.equal(themed.user.mapTheme, 'dark');
    assert.equal(themed.user.emailNotifications, false);
    assert.equal(themed.user.role, 'citizen');
    const localArea = await request('/auth/preferences', 200, { method: 'PUT', token, body: { selectedArea: { city: 'Hyderabad', state: 'Telangana' } } });
    assert.deepEqual(localArea.user.selectedArea, { city: 'Hyderabad', state: 'Telangana' });
    await request('/auth/preferences', 400, { method: 'PUT', token, body: { selectedArea: { city: '', state: '' } } });
    assert.equal((await post('/auth/login', 200, citizen)).user.mapTheme, 'dark');
    assert.equal((await post('/auth/login', 200, { ...citizen, email: 'other@example.test' })).user.mapTheme, 'light');
    assert.equal((await post('/auth/login', 200, citizen)).user.emailNotifications, false);
    const avatarForm = new FormData();
    avatarForm.append('avatar', new Blob(['synthetic avatar'], { type: 'image/png' }), 'avatar.png');
    assert.match((await request('/auth/avatar', 503, { method: 'PUT', token, body: avatarForm })).message, /unavailable/);
    await request('/auth/avatar', 200, { method: 'DELETE', token });
    await request('/auth/profile', 400, { method: 'PUT', token, body: { name: {} } });
    await request('/auth/profile', 400, { method: 'PUT', token, body: { name: ' ' } });
    const profile = await request('/auth/profile', 200, { method: 'PUT', token, body: { name: 'Updated Demo Citizen' } });
    assert.equal(profile.user.name, 'Updated Demo Citizen');

    const complaint = {
        title: "Streetlight out", description: "The streetlight at the junction is out.",
        category: "Infrastructure", location: "Demo junction",
    };
    await post("/complaints", 403, complaint, token);
    await post("/auth/verify-aadhaar", 200, { aadhaarNumber: demoCode }, token);
    const verifiedRoute = await post('/complaints', 201, { ...complaint, city: 'DemoCity', state: 'TestState' }, token);
    assert.equal(verifiedRoute.routingStatus, 'routed');
    assert.equal(verifiedRoute.assignedDepartment, 'Synthetic Public Works');
    assert.ok(verifiedRoute.history.some(event => event.action === 'Department Routed'));
    const demoRoute = await post('/complaints', 201, { ...complaint, category: 'Public Service', city: 'DemoCity', state: 'TestState' }, token);
    assert.equal(demoRoute.routingStatus, 'review');
    assert.equal(demoRoute.routingSource, 'demo');
    assert.ok(demoRoute.history.some(event => event.action === 'Demo Routing Suggestion'));
    await post("/auth/verify-aadhaar", 400, { aadhaarNumber: "000000000099" }, otherToken);
    await post("/auth/verify-aadhaar", 400, { aadhaarNumber: "000000000099" }, otherToken);
    await post("/auth/verify-aadhaar", 400, { aadhaarNumber: "000000000099" }, otherToken);
    await post("/auth/verify-aadhaar", 429, { aadhaarNumber: "000000000099" }, otherToken);
    await post("/complaints", 403, complaint, officialToken);
    await post("/complaints", 400, { ...complaint, lat: 91, lng: 0 }, token);
    await post("/complaints", 400, { ...complaint, lat: 10 }, token);
    await post("/complaints", 400, { ...complaint, location: " " }, token);
    const imageForm = new FormData();
    for (const [field, value] of Object.entries(complaint)) imageForm.append(field, value);
    imageForm.append('images', new Blob(['synthetic image'], { type: 'image/png' }), 'demo.png');
    assert.match((await post('/complaints', 503, imageForm, token)).message, /unavailable/);
    const form = new FormData();
    for (const [field, value] of Object.entries(complaint)) form.append(field, value);
    const filed = await post("/complaints", 201, form, token);
    assert.match(filed.complaintId, /^CC-\d{4}-\d+$/);
    assert.equal(filed.isPublic, false);
    assert.equal(filed.lat, null);
    assert.equal(filed.lng, null);
    assert.ok((await request('/complaints/my', 200, { token })).some(item => item._id === filed._id));
    assert.ok((await request('/complaints/visible', 200, { token })).some(item => item._id === filed._id));
    const edited = await request(`/complaints/${filed._id}/citizen-edit`, 200, { method: 'PATCH', token, body: { title: 'Streetlight out near Demo Junction', version: filed.__v } });
    assert.equal(edited.complaintId, filed.complaintId, 'tracking IDs remain stable after citizen edits');
    assert.ok(edited.history.some(event => event.action === 'Citizen Correction'));
    assert.deepEqual(await request("/complaints", 200), []);
    await request(`/complaints/track/${filed.complaintId}`, 403, { token: otherToken });
    await request("/complaints/admin", 403, { token });
    await request(`/complaints/${filed._id}`, 403, { token: otherToken });
    await request('/complaints/not-an-id', 400, { token });
    await request(`/complaints/${filed._id}`, 401);
    await request(`/complaints/${filed._id}`, 403, { method: 'PUT', token, body: { status: 'Resolved' } });
    await request(`/complaints/${filed._id}`, 403, { method: 'DELETE', token: otherToken });
    await post(`/complaints/${filed._id}/toggle-chat`, 403, {}, token);
    await post(`/complaints/${filed._id}/escalate`, 403, { reason: 'forged' }, token);
    await post(`/complaints/${filed._id}/rate`, 400, { rating: 5 }, token);
    await post(`/complaints/${filed._id}/message`, 403, { text: 'closed thread' }, token);
    await post(`/complaints/${filed._id}/toggle-chat`, 200, {}, officialToken);
    await post(`/complaints/${filed._id}/message`, 403, { text: 'intruder' }, otherToken);
    await post(`/complaints/${filed._id}/message`, 200, { text: 'Please inspect the junction.' }, token);
    await post(`/complaints/${filed._id}/message`, 200, { text: 'Maintenance crew assigned.' }, officialToken);
    await request(`/complaints/${filed._id}`, 400, { method: 'PUT', token: officialToken, body: { status: 'Invalid' } });
    await request(`/complaints/${filed._id}`, 200, { method: 'PUT', token: officialToken, body: { status: 'In Progress' } });

    const shared = await post("/complaints", 201, { ...complaint, city: 'Hyderabad', state: 'Telangana', isPublic: true, lat: 0, lng: 0 }, token);
    assert.equal(shared.lat, 0);
    const pinned = (await request('/complaints/my', 200, { token })).find(item => item._id === shared._id);
    assert.equal(pinned.lat, 0);
    assert.equal(pinned.lng, 0);
    assert.equal(shared.lng, 0);
    await post(`/complaints/${shared._id}/toggle-chat`, 200, {}, officialToken);
    await post(`/complaints/${shared._id}/message`, 200, { text: "Private follow-up" }, token);
    const [publicComplaint] = await request("/complaints", 200);
    const tracked = await request(`/complaints/track/${shared.complaintId}`, 200, { token: otherToken });
    for (const summary of [publicComplaint, tracked]) {
        assert.equal(summary._id, shared._id);
        assert.equal(summary.messages, undefined);
        assert.equal(summary.user.email, undefined);
        assert.equal(summary.user._id, undefined);
        assert.equal(summary.user.password, undefined);
        assert.equal(summary.history, undefined);
        assert.equal(summary.escalationLetters, undefined);
    }

    assert.ok((await request('/complaints/areas', 200)).some(area => area.city === shared.city && area.state === shared.state));
    await request('/complaints?city=Hyderabad&state=Telangana', 200);
    const duplicateList = await request('/complaints/duplicates?category=Infrastructure&lat=0&lng=0', 200, { token: otherToken });
    assert.ok(duplicateList.matches.some(item => item._id === shared._id));
    await request(`/complaints/${filed._id}/follow`, 404, { method: 'POST', token: otherToken, body: { following: true } });
    await request(`/complaints/${shared._id}/follow`, 200, { method: 'POST', token: otherToken, body: { following: true } });
    assert.ok((await request('/complaints/followed', 200, { token: otherToken })).some(item => item._id === shared._id));
    const sharedDetail = await request(`/complaints/${shared._id}`, 200, { token });
    assert.equal(sharedDetail.routingStatus, 'review');
    const assigned = await request(`/complaints/${shared._id}/assignment`, 200, { method: 'PATCH', token: officialToken, body: { department: 'Demo Public Works', jurisdiction: 'Demo Area', version: sharedDetail.__v } });
    assert.equal(assigned.routingStatus, 'assigned');
    assert.ok(assigned.history.some(item => item.action === 'Department Assigned'));
    await request(`/complaints/${shared._id}/citizen-edit`, 409, { method: 'PATCH', token, body: { title: 'Citizen edit after staff assignment', version: assigned.__v } });
    const correction = await request(`/complaints/${shared._id}/corrections`, 201, { method: 'POST', token, body: { message: 'The nearest intersection is Oak Street.', version: assigned.__v } });
    await request(`/complaints/${shared._id}/corrections/${correction.correctionRequests.at(-1)._id}`, 403, { method: 'PATCH', token, body: { status: 'accepted', version: correction.__v } });
    const reviewed = await request(`/complaints/${shared._id}/corrections/${correction.correctionRequests.at(-1)._id}`, 200, { method: 'PATCH', token: officialToken, body: { status: 'accepted', version: correction.__v } });
    assert.equal(reviewed.correctionRequests.at(-1).status, 'accepted');
    await request(`/complaints/${shared._id}/assignment`, 200, { method: 'PATCH', token: officialToken, body: { department: 'Demo Lighting', jurisdiction: 'Demo Area', version: reviewed.__v } });
    const changedVersion = await request(`/complaints/${shared._id}`, 200, { token });
    await request(`/complaints/${shared._id}/citizen-edit`, 409, { method: 'PATCH', token, body: { title: 'Stale data', version: changedVersion.__v - 1 } });

    const concurrent = await post('/complaints', 201, { ...complaint, title: 'Concurrent edit case' }, token);
    await request(`/complaints/${concurrent._id}`, 200, { method: 'PUT', token: officialToken, body: { status: 'In Progress', version: concurrent.__v } });
    await request(`/complaints/${concurrent._id}/citizen-edit`, 409, { method: 'PATCH', token, body: { title: 'Stale citizen change', version: concurrent.__v } });

    const feedbackOnly = await post('/complaints', 201, { ...complaint, title: 'Official response case' }, token);
    const feedbackUpdated = await request(`/complaints/${feedbackOnly._id}`, 200, { method: 'PUT', token: officialToken, body: { adminFeedback: 'Crew scheduled.', version: feedbackOnly.__v } });
    assert.ok(feedbackUpdated.staffActionAt, 'an official response prevents subsequent citizen direct edits');
    assert.ok(feedbackUpdated.history.some(event => event.action === 'Official Response Updated'));
    await request(`/complaints/${feedbackOnly._id}/citizen-edit`, 409, { method: 'PATCH', token, body: { title: 'Unsafe overwrite', version: feedbackUpdated.__v } });

    const withdrawable = await post('/complaints', 201, { ...complaint, title: 'Temporary road hazard', isPublic: true }, token);
    const pendingCorrection = await post(`/complaints/${withdrawable._id}/corrections`, 201, { message: 'Use the south entrance.', version: withdrawable.__v }, token);
    const withdrawal = await post(`/complaints/${withdrawable._id}/withdraw`, 200, { version: pendingCorrection.__v }, token);
    assert.equal(withdrawal.status, 'Withdrawn');
    assert.ok(withdrawal.history.some(item => item.action === 'Complaint Withdrawn'));
    assert.ok(withdrawal.history.some(item => item.action === 'Correction Requested'));
    assert.ok(!(await request('/complaints', 200)).some(item => item._id === withdrawable._id));
    assert.ok(!(await request('/complaints/visible', 200, { token })).some(item => item._id === withdrawable._id));
    await request(`/complaints/${withdrawable._id}/withdraw`, 409, { method: 'POST', token, body: { version: withdrawal.__v } });
    await request(`/complaints/${withdrawable._id}/corrections/${pendingCorrection.correctionRequests.at(-1)._id}`, 409, { method: 'PATCH', token: officialToken, body: { status: 'accepted', version: withdrawal.__v } });
    await post(`/complaints/${withdrawable._id}/escalate`, 400, { reason: 'Closed case must stay withdrawn.' }, officialToken);
    await request(`/complaints/${withdrawable._id}`, 409, { method: 'PUT', token: officialToken, body: { status: 'In Progress', version: withdrawal.__v } });
    await request(`/complaints/${withdrawable._id}/assignment`, 409, { method: 'PATCH', token: officialToken, body: { department: 'Demo', jurisdiction: 'Demo', version: withdrawal.__v } });
    await post(`/complaints/${withdrawable._id}/message`, 409, { text: 'Should not append after withdrawal.' }, token);
    await post(`/complaints/${withdrawable._id}/message`, 409, { text: 'Should not append after withdrawal.' }, officialToken);
    await post(`/complaints/${withdrawable._id}/toggle-chat`, 409, {}, officialToken);
    await post(`/complaints/${withdrawable._id}/request-reopen`, 409, {}, token);
    await request(`/complaints/${withdrawable._id}/visibility`, 409, { method: 'PATCH', token, body: { isPublic: false } });

    await post(`/complaints/${filed._id}/escalate`, 200, { reason: "Needs maintenance crew" }, officialToken);
    const visibilityRoute = `/complaints/${shared._id}/visibility`;
    for (const forbiddenToken of [otherToken, officialToken]) {
        await request(visibilityRoute, 403, { method: 'PATCH', token: forbiddenToken, body: { isPublic: false } });
    }
    await request(visibilityRoute, 400, { method: 'PATCH', token, body: { isPublic: 'false' } });
    await request(visibilityRoute, 200, { method: 'PATCH', token, body: { isPublic: false } });
    assert.deepEqual(await request('/complaints', 200), []);
    await request(`/complaints/track/${shared.complaintId}`, 403, { token: otherToken });
    await request(visibilityRoute, 200, { method: 'PATCH', token, body: { isPublic: true } });
    assert.equal((await request('/complaints', 200)).length, 1);
    await request(`/complaints/${filed._id}`, 200, {
        method: "PUT", token: officialToken, body: { status: "Resolved" },
    });
    const resolved = await request(`/complaints/track/${filed.complaintId}`, 200, { token });
    assert.equal(resolved.status, "Resolved");
    assert.ok(resolved.history.some(event => event.action === "Complaint Resolved"));
    assert.ok(resolved.history.some(event => event.action === "Status Updated"));
    assert.equal(resolved.messages.length, 2);
    await post(`/complaints/${filed._id}/rate`, 403, { rating: 5 }, otherToken);
    await post(`/complaints/${filed._id}/rate`, 400, { rating: 6 }, token);
    await post(`/complaints/${filed._id}/rate`, 200, { rating: 5 }, token);
    assert.equal((await request(`/complaints/${filed._id}`, 200, { token })).rating, 5);
    // Approval is rechecked against MongoDB on every request, including issued JWTs.
    const connection = await mongoose.createConnection(env.MONGO_URI).asPromise();
    try {
        await connection.collection('users').updateOne({ email: officialEmail }, { $set: { isApproved: false } });
        await request('/complaints/admin', 403, { token: officialToken });
        await connection.collection('users').updateOne({ email: officialEmail }, { $set: { isApproved: true } });
    } finally { await connection.close(); }
    for (let attempt = 0; attempt < 4; attempt++)
        await post('/auth/login', 400, { email: `unknown-${attempt}@example.test`, password: 'invalid', role: 'citizen' });
    await post('/auth/login', 429, { email: 'rate-limited@example.test', password: 'invalid', role: 'citizen' });
    await request("/dashboard/citizen", 200, { token });
    await request("/dashboard/admin", 200, { token: officialToken });
});
