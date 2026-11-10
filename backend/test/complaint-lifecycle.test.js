const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { test } = require("node:test");
const mongoose = require("mongoose");

const backendDir = path.resolve(__dirname, "..");
const citizenEmail = "citizen@example.test";
const officialEmail = "official@example.test";
const demoCode = "000000000001";
const password = "Demo-test-password";
const adminSecretCode = "test-only-official-code";

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

    const complaint = {
        title: "Streetlight out", description: "The streetlight at the junction is out.",
        category: "Infrastructure", location: "Demo junction",
    };
    await post("/complaints", 403, complaint, token);
    await post("/auth/verify-aadhaar", 200, { aadhaarNumber: demoCode }, token);
    const form = new FormData();
    for (const [field, value] of Object.entries(complaint)) form.append(field, value);
    const filed = await post("/complaints", 201, form, token);
    assert.match(filed.complaintId, /^CC-\d{4}-\d+$/);
    assert.equal(filed.isPublic, false);
    assert.deepEqual(await request("/complaints", 200), []);
    await request(`/complaints/track/${filed.complaintId}`, 403, { token: otherToken });
    await request("/complaints/admin", 403, { token });

    const shared = await post("/complaints", 201, { ...complaint, isPublic: true }, token);
    await post(`/complaints/${shared._id}/toggle-chat`, 200, {}, officialToken);
    await post(`/complaints/${shared._id}/message`, 200, { text: "Private follow-up" }, token);
    const [publicComplaint] = await request("/complaints", 200);
    const tracked = await request(`/complaints/track/${shared.complaintId}`, 200, { token: otherToken });
    for (const summary of [publicComplaint, tracked]) {
        assert.equal(summary._id, shared._id);
        assert.equal(summary.messages, undefined);
        assert.equal(summary.user.email, undefined);
    }

    await post(`/complaints/${filed._id}/escalate`, 200, { reason: "Needs maintenance crew" }, officialToken);
    await request(`/complaints/${filed._id}`, 200, {
        method: "PUT", token: officialToken, body: { status: "Resolved" },
    });
    const resolved = await request(`/complaints/track/${filed.complaintId}`, 200, { token });
    assert.equal(resolved.status, "Resolved");
    assert.ok(resolved.history.some(event => event.action === "Complaint Resolved"));
    await post(`/complaints/${filed._id}/rate`, 200, { rating: 5 }, token);
    await request("/dashboard/citizen", 200, { token });
    await request("/dashboard/admin", 200, { token: officialToken });
});
