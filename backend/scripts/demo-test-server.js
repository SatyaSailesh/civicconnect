const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

async function main() {
    const mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', dbName: 'civicconnect_demo' } });
    const cwd = path.resolve(__dirname, '..');
    const demoEnv = dotenv.parse(fs.readFileSync(path.join(cwd, '.env.demo.example')));
    const uploadEnv = process.env.CIVICCONNECT_TEST_UPLOADS === '1' && fs.existsSync(path.join(cwd, '.env'))
        ? dotenv.parse(fs.readFileSync(path.join(cwd, '.env'))) : {};
    const env = { ...demoEnv, ...process.env,
        CLOUDINARY_CLOUD_NAME: uploadEnv.CLOUDINARY_CLOUD_NAME || '',
        CLOUDINARY_API_KEY: uploadEnv.CLOUDINARY_API_KEY || '',
        CLOUDINARY_API_SECRET: uploadEnv.CLOUDINARY_API_SECRET || '',
        EMAIL_USER: '', EMAIL_PASS: '',
        MONGO_URI: mongo.getUri('civicconnect_demo'), PORT: '5001', FRONTEND_URL: 'http://localhost:5174' };
    execFileSync(process.execPath, ['scripts/seed-demo.js'], { cwd, env, stdio: 'inherit' });
    // Running twice verifies that repeat seeding is non-destructive.
    execFileSync(process.execPath, ['scripts/seed-demo.js'], { cwd, env, stdio: 'inherit' });
    const child = spawn(process.execPath, ['server.js'], { cwd, env, stdio: 'inherit' });
    async function stop() { child.kill(); await mongo.stop(); process.exit(); }
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    child.on('exit', async code => { await mongo.stop(); process.exit(code ?? 0); });
}
main().catch(error => { console.error(error); process.exit(1); });
