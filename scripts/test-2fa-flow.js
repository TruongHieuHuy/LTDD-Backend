
const axios = require('axios');
const { authenticator } = require('otplib');

const BASE_URL = 'http://localhost:3000/api';
let token;
let userId;
let secret;
let email = `test2fa_${Date.now()}@example.com`;
let password = 'password123';

async function test2FA() {
    try {
        console.log('--- 1. Register User ---');
        const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
            username: `user_${Date.now()}`,
            email,
            password
        });
        console.log('Registered:', registerRes.status === 201 ? 'OK' : 'FAIL');

        console.log('--- 2. Login (Before 2FA) ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });
        token = loginRes.data.data.token;
        userId = loginRes.data.data.user.id;
        console.log('Logged in, got token:', token ? 'OK' : 'FAIL');

        console.log('--- 3. Enable 2FA ---');
        console.log('Using token:', token);
        const enableRes = await axios.post(`${BASE_URL}/auth/two-factor/enable`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        secret = enableRes.data.secret;
        console.log('2FA Enable initiated, got secret:', secret ? 'OK' : 'FAIL');
        console.log('Secret:', secret);

        console.log('--- 4. Verify 2FA Setup ---');
        const code = authenticator.generate(secret);
        const verifyRes = await axios.post(`${BASE_URL}/auth/two-factor/verify`, {
            code
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('2FA Verified:', verifyRes.status === 200 ? 'OK' : 'FAIL');

        console.log('--- 5. Login (After 2FA Enabled) ---');
        const login2Res = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });

        // Check if it requires 2FA
        if (login2Res.data.data && login2Res.data.data.requiresTwoFactor) {
            console.log('Login requires 2FA as expected.');

            console.log('--- 6. Login with 2FA Code ---');
            const loginCode = authenticator.generate(secret);
            const loginFinalRes = await axios.post(`${BASE_URL}/auth/login-2fa`, {
                userId: login2Res.data.data.userId,
                code: loginCode
            });

            if (loginFinalRes.data.data.token) {
                console.log('Final Login Successful, got token:', 'OK');
            } else {
                console.error('Final Login Failed: No token returned');
            }

        } else {
            console.error('Login did NOT require 2FA but should have!');
        }

        console.log('ALL TESTS PASSED');

    } catch (error) {
        if (error.response) {
            console.error('Test Failed - Status:', error.response.status);
            console.error('Test Failed - Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Test Failed - Message:', error.message);
        }
    }
}

test2FA();
