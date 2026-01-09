/**
 * Guess Number Game Logic
 * Player guesses a secret number within a range, gets hints (higher/lower)
 */

// Game configurations
const GAME_CONFIGS = {
    easy: { min: 1, max: 50, maxAttempts: 8 },
    medium: { min: 1, max: 100, maxAttempts: 7 },
    hard: { min: 1, max: 200, maxAttempts: 6 },
    expert: { min: 1, max: 500, maxAttempts: 7 },
};

/**
 * Get configuration for difficulty
 * @param {string} difficulty - Difficulty level
 * @returns {object} config
 */
function getConfig(difficulty) {
    return GAME_CONFIGS[difficulty] || GAME_CONFIGS.medium;
}

/**
 * Generate a random number within range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} random number
 */
function generateSecretNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create initial session data for new game
 * @param {string} difficulty - Difficulty level
 * @returns {object} session data
 */
function createInitialSessionData(difficulty) {
    const config = getConfig(difficulty);
    const secretNumber = generateSecretNumber(config.min, config.max);

    return {
        secretNumber,
        guesses: [],
        config: {
            min: config.min,
            max: config.max,
            maxAttempts: config.maxAttempts,
        },
    };
}

/**
 * Process a guess and return result
 * @param {object} sessionData - Current session data
 * @param {number} guess - Player's guess
 * @returns {object} result with hint and status
 */
function processGuess(sessionData, guess) {
    const { secretNumber, guesses, config } = sessionData;

    // Validate guess is in range
    if (guess < config.min || guess > config.max) {
        throw new Error(`Guess must be between ${config.min} and ${config.max}`);
    }

    // Check if correct
    const correct = guess === secretNumber;

    // Generate hint
    let hint = null;
    if (!correct) {
        hint = guess < secretNumber ? 'higher' : 'lower';
    }

    // Add to guesses history
    const guessEntry = {
        value: guess,
        hint,
        timestamp: new Date().toISOString(),
    };
    guesses.push(guessEntry);

    const attemptsUsed = guesses.length;
    const attemptsLeft = config.maxAttempts - attemptsUsed;
    const gameOver = correct || attemptsLeft === 0;

    return {
        correct,
        hint,
        attemptsUsed,
        attemptsLeft,
        gameOver,
        secretNumber: gameOver ? secretNumber : undefined, // Only reveal when game over
    };
}

/**
 * Extract hints from guesses for response
 * @param {Array} guesses - Array of guess entries
 * @returns {Array<string>} array of hints
 */
function extractHints(guesses) {
    return guesses.map((g) => g.hint).filter((h) => h !== null);
}

/**
 * Extract guess values for response
 * @param {Array} guesses - Array of guess entries
 * @returns {Array<number>} array of guess values
 */
function extractGuessValues(guesses) {
    return guesses.map((g) => g.value);
}

module.exports = {
    getConfig,
    generateSecretNumber,
    createInitialSessionData,
    processGuess,
    extractHints,
    extractGuessValues,
    GAME_CONFIGS,
};
