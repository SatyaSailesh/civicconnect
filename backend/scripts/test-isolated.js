const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function main() {
    const mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
    try {
        const child = spawn(process.execPath, ['--test', 'test/complaint-lifecycle.test.js'], {
            cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
            env: { ...process.env, TEST_MONGO_PORT: String(mongo.instanceInfo.port) },
        });
        process.exitCode = await new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', code => resolve(code ?? 1));
        });
    } finally { await mongo.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
