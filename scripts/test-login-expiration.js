const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth';

async function registerUser(email, password, username) {
    try {
        const response = await axios.post(`${API_URL}/register`, {
            email,
            password,
            username
        });
        console.log('User registered:', email);
        return true;
    } catch (error) {
        if (error.response && (error.response.data.message.includes('already exists'))) {
            console.log('User already exists, proceeding to login...');
            return true;
        }
        console.error('Registration failed:', JSON.stringify(error.response ? error.response.data : error.message, null, 2));
        return false;
    }
}

async function testLogin(email, password, rememberMe) {
    try {
        console.log(`Testing login with rememberMe=${rememberMe}...`);
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password,
            rememberMe
        });

        const token = response.data.data.token;
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        const iat = new Date(payload.iat * 1000);
        const exp = new Date(payload.exp * 1000);
        const durationHours = (exp - iat) / (1000 * 60 * 60);
        const durationDays = durationHours / 24;

        console.log(`Token issued at: ${iat.toISOString()}`);
        console.log(`Token expires at: ${exp.toISOString()}`);
        console.log(`Token duration: ${durationHours.toFixed(2)} hours (${durationDays.toFixed(2)} days)`);
        console.log('-----------------------------------');
        return durationDays;
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
    }
}

async function runTest() {
    const timestamp = Date.now();
    const email = `test_rem_${timestamp}@example.com`;
    const password = 'password123';
    const username = `u_${timestamp.toString().slice(-8)}`;

    if (await registerUser(email, password, username)) {
        // First, verify current behavior (should be ~30 days for both)
        await testLogin(email, password, false);
        await testLogin(email, password, true);
    }
}

runTest();
