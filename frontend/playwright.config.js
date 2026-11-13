import { defineConfig } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
    testDir: './e2e', timeout: 180000, workers: 1,
    use: { baseURL: 'http://localhost:5174', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure' },
    webServer: [
        { command: 'node ../backend/scripts/demo-test-server.js', url: 'http://localhost:5001/health', timeout: 120000 },
        { command: 'node node_modules/vite/bin/vite.js --host localhost --port 5174 --strictPort', url: 'http://localhost:5174', env: { VITE_API_URL: 'http://localhost:5001/api' } },
    ],
});
