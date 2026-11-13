import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com https://res.cloudinary.com; connect-src 'self' http://localhost:* ws://localhost:* https://*.onrender.com https://nominatim.openstreetmap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; worker-src 'self' blob:",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
}
// Vite injects a small inline React Refresh preamble only in dev mode.
const developmentHeaders = {
  ...securityHeaders,
  'Content-Security-Policy': securityHeaders['Content-Security-Policy'].replace("script-src 'self';", "script-src 'self' 'unsafe-inline';"),
}

export default defineConfig({
  plugins: [react()],
  server: {
    headers: developmentHeaders,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  preview: { headers: securityHeaders },
})
