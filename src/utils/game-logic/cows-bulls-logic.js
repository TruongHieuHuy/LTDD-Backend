/**
 * Cows & Bulls Game Logic
 * Player guesses a 4-digit number with no repeating digits
 * Bulls = correct digit in correct position
 * Cows = correct digit in wrong position
 */

// Game configurations
const GAME_CONFIGS = {
    easy: { maxAttempts: 10 },
    medium: { maxAttempts: 8 },
    hard: { maxAttempts: 6 },
    expert: { maxAttempts: 5 },
};

const HINT_PENALTY = 500;

/**
 * Get configuration for difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {object} config
 */
function getConfig(difficulty) {
    return GAME_CONFIGS[difficulty] || GAME_CONFIGS.medium;
}

/**
 * Generate a 4-digit secret number with no repeating digits
 * @returns {string} 4-digit number as string
 */
function generateSecretNumber() {
    const digits = [];
    while (digits.length < 4) {
        const digit = Math.floor(Math.random() * 10);
        if (!digits.includes(digit)) {
            digits.push(digit);
        }
    }
    return digits.join('');
}

/**
 * Validate guess format
 * @param {string} guess - User's guess
 * @returns {boolean} true if valid
 * @throws {Error} if invalid
 */
function validateGuess(guess) {
    if (typeof guess !== 'string' || guess.length !== 4) {
        throw new Error('Guess must be exactly 4 digits');
    }

    if (!/^\d{4}$/.test(guess)) {
        throw new Error('Guess must contain only digits');
    }

    // Check for repeating digits
    const digits = guess.split('');
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size !== 4) {
        throw new Error('Guess must have no repeating digits');
    }

    return true;
}

/**
 * Calculate Bulls and Cows
 * @param {string} secret - Secret number
 * @param {string} guess - User's guess
 * @returns {object} { bulls, cows }
 */
function calculateBullsAndCows(secret, guess) {
    let bulls = 0;
    let cows = 0;

    const secretDigits = secret.split('');
    const guessDigits = guess.split('');

    // Count bulls (correct position)
    for (let i = 0; i < 4; i++) {
        if (guessDigits[i] === secretDigits[i]) {
            bulls++;
        }
    }

    // Count cows (correct digit, wrong position)
    for (let i = 0; i < 4; i++) {
        if (guessDigits[i] !== secretDigits[i]) {
            // Not a bull
            const indexInSecret = secretDigits.indexOf(guessDigits[i]);
            if (indexInSecret !== -1 && indexInSecret !== i) {
                cows++;
            }
        }
    }

    return { bulls, cows };
}

/**
 * Create initial session data for new game
 * @param {string} difficulty - Difficulty level
 * @returns {object} session data
 */
function createInitialSessionData(difficulty) {
    const config = getConfig(difficulty);
    const secretNumber = generateSecretNumber();

    return {
        secretNumber,
        guesses: [],
        hintsUsed: 0,
        revealedDigits: [],
        config: {
            maxAttempts: config.maxAttempts,
        },
    };
}

/**
 * Process a guess and return result
 * @param {object} sessionData - Current session data
 * @param {string} guess - Player's guess
 * @returns {object} result with bulls/cows
 */
function processGuess(sessionData, guess) {
    validateGuess(guess);

    const { secretNumber, guesses, config } = sessionData;

    // Calculate bulls and cows
    const { bulls, cows } = calculateBullsAndCows(secretNumber, guess);

    // Check if correct (4 bulls)
    const correct = bulls === 4;

    // Add to guesses history
    const guessEntry = {
        guess,
        bulls,
        cows,
        timestamp: new Date().toISOString(),
    };
    guesses.push(guessEntry);

    const attemptsUsed = guesses.length;
    const attemptsLeft = config.maxAttempts - attemptsUsed;
    const gameOver = correct || attemptsLeft === 0;

    return {
        guess,
        bulls,
        cows,
        correct,
        attemptsUsed,
        attemptsLeft,
        gameOver,
        history: guesses.map((g) => ({ guess: g.guess, bulls: g.bulls, cows: g.cows })),
        secretNumber: gameOver ? secretNumber : undefined,
    };
}

/**
 * Get a hint - reveal one digit
 * @param {object} sessionData - Current session data
 * @returns {object} { digit, position, scoreReduction }
 */
function getHint(sessionData) {
    const { secretNumber, revealedDigits } = sessionData;

    // Find unrevealed positions
    const secretDigits = secretNumber.split('');
    const unrevealedPositions = [];

    for (let i = 0; i < 4; i++) {
        if (!revealedDigits.some((r) => r.position === i)) {
            unrevealedPositions.push(i);
        }
    }

    if (unrevealedPositions.length === 0) {
        throw new Error('All digits have been revealed');
    }

    // Pick a random unrevealed position
    const randomIndex = Math.floor(Math.random() * unrevealedPositions.length);
    const position = unrevealedPositions[randomIndex];
    const digit = secretDigits[position];

    // Add to revealed digits
    revealedDigits.push({ position, digit });
    sessionData.hintsUsed++;

    return {
        digit,
        position,
        scoreReduction: HINT_PENALTY,
        hintsUsed: sessionData.hintsUsed,
    };
}

module.exports = {
    getConfig,
    generateSecretNumber,
    validateGuess,
    calculateBullsAndCows,
    createInitialSessionData,
    processGuess,
    getHint,
    GAME_CONFIGS,
    HINT_PENALTY,
};
