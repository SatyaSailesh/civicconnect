require('dotenv').config();
const { randomUUID } = require('node:crypto');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');

async function main() {
    if (["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(key => process.env[key])) {
        cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
        const publicId = `civicconnect/integration-check/${randomUUID()}`;
        let uploaded = false;
        try {
            await cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZsAAAAASUVORK5CYII=', { public_id: publicId, timeout: 15000 });
            uploaded = true;
            console.log('Cloudinary: synthetic image upload passed');
        } catch (error) { console.log(`Cloudinary: failed (${error.http_code || error.code || 'provider error'})`); process.exitCode = 1; }
        finally {
            if (uploaded) {
                await cloudinary.uploader.destroy(publicId, { timeout: 15000 });
                console.log('Cloudinary: test image removed');
            }
        }
    } else console.log('Cloudinary: disabled');
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
        try { await transport.verify(); console.log('Email: SMTP authentication passed (delivery not tested)'); }
        catch (error) { console.log(`Email: SMTP verification failed (${error.code || 'provider error'})`); process.exitCode = 1; }
        finally { transport.close(); }
    } else console.log('Email: disabled');
}
main().catch(() => { console.error('Integration check or cleanup failed'); process.exitCode = 1; });
