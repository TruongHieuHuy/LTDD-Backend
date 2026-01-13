async function testRubikScore() {
    const baseUrl = 'http://localhost:3001';
    let token = '';

    try {
        // Helper for requests
        const request = async (url, method, body, headers = {}) => {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            return { status: response.status, data };
        };

        const timestamp = Date.now();

        // Username max 20 chars. "user_" + last 8 digits of timestamp
        const username = 'u_' + timestamp.toString().slice(-8);
        const email = `rubik_${timestamp}@test.com`;
        const password = 'password123';

        // 1. Register/Login a test user
        console.log('1. Registering/Logging in test user...', email);
        const loginRes = await request(`${baseUrl}/api/auth/register`, 'POST', {
            username,
            email,
            password
        });

        if (loginRes.data.success && loginRes.data.data && loginRes.data.data.token) {
            token = loginRes.data.data.token;
        } else {
            console.log('Registration response:', JSON.stringify(loginRes.data));
            // Try login just in case
            const loginRes2 = await request(`${baseUrl}/api/auth/login`, 'POST', {
                email,
                password
            });
            if (loginRes2.data.success && loginRes2.data.data && loginRes2.data.data.token) {
                token = loginRes2.data.data.token;
            } else {
                console.log('Login response:', JSON.stringify(loginRes2.data));
            }
        }

        if (!token) throw new Error('Could not get token');
        console.log('   -> Logged in successfully.');

        // 2. Submit Rubik score (Time: 100s, Moves: 50, Difficulty: medium)
        // Formula: 10000 - (100*2) - (50*5) = 9550
        // Multiplier: Medium = 1.5
        // Expected Score: floor(9550 * 1.5) = 14325
        console.log('2. Submitting Rubik score (Time: 100, Moves: 50, Diff: medium)...');

        const scoreRes = await request(`${baseUrl}/api/scores`, 'POST', {
            gameType: 'rubik',
            difficulty: 'medium',
            timeSpent: 100,
            moves: 50,
            attempts: 1
        }, {
            Authorization: `Bearer ${token}`
        });

        if (!scoreRes.data.success) {
            throw new Error('Score submission failed: ' + JSON.stringify(scoreRes.data));
        }

        const savedScore = scoreRes.data.data.score;
        console.log('   -> Score saved:', savedScore.score);

        // 3. Verify
        const expectedScore = Math.floor((10000 - (100 * 2) - (50 * 5)) * 1.5);
        if (savedScore.score === expectedScore) {
            console.log('✅ SUCCESS: Score matched expected value:', expectedScore);
        } else {
            console.error('❌ FAILURE: Score mismatch. Expected:', expectedScore, 'Got:', savedScore.score);
        }

        if (savedScore.gameData && savedScore.gameData.moves === 50) {
            console.log('✅ SUCCESS: Moves stored in gameData correctly.');
        } else {
            console.error('❌ FAILURE: Moves not found in gameData.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRubikScore();
