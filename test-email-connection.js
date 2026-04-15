const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
    console.log('Testing Email Configuration...');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Host:', process.env.EMAIL_HOST);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ Connection successful! SMTP is configured correctly.');
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
}

testConnection();
