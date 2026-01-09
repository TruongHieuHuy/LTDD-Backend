/**
 * Memory Match Game Logic
 * Player flips pairs of cards to find matches
 * Server tracks all moves to prevent cheating
 */

// Game configurations
const GAME_CONFIGS = {
    easy: { rows: 4, cols: 4, pairs: 8, maxTime: 180 },
    medium: { rows: 4, cols: 6, pairs: 12, maxTime: 240 },
    hard: { rows: 6, cols: 6, pairs: 18, maxTime: 300 },
    expert: { rows: 6, cols: 8, pairs: 24, maxTime: 360 },
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
 * Generate shuffled cards array
 * @param {number} pairs - Number of pairs
 * @returns {Array<number>} shuffled card IDs
 */
function generateCards(pairs) {
    // Create pairs: [1,1,2,2,3,3,...]
    const cards = [];
    for (let i = 1; i <= pairs; i++) {
        cards.push(i, i);
    }

    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

/**
 * Create initial session data for new game
 * @param {string} difficulty - Difficulty level
 * @returns {object} session data
 */
function createInitialSessionData(difficulty) {
    const config = getConfig(difficulty);
    const cards = generateCards(config.pairs);

    return {
        cards, // Array of card IDs
        flippedPairs: [], // Array of indices that have been matched
        moves: 0, // SERVER-TRACKED move counter
        config: {
            gridSize: `${config.rows}x${config.cols}`,
            totalPairs: config.pairs,
            maxTime: config.maxTime,
        },
    };
}

/**
 * Process a card flip
 * @param {object} sessionData - Current session data
 * @param {number} cardIndex1 - First card index
 * @param {number} cardIndex2 - Second card index
 * @returns {object} flip result
 */
function processFlip(sessionData, cardIndex1, cardIndex2) {
    const { cards, flippedPairs, config } = sessionData;

    // Validate indices
    if (
        cardIndex1 < 0 ||
        cardIndex1 >= cards.length ||
        cardIndex2 < 0 ||
        cardIndex2 >= cards.length
    ) {
        throw new Error('Invalid card index');
    }

    if (cardIndex1 === cardIndex2) {
        throw new Error('Cannot flip the same card twice');
    }

    // Check if cards are already matched
    if (flippedPairs.includes(cardIndex1) || flippedPairs.includes(cardIndex2)) {
        throw new Error('Cards are already matched');
    }

    // Increment server-side move counter
    sessionData.moves++;

    // Get card values
    const card1Value = cards[cardIndex1];
    const card2Value = cards[cardIndex2];

    // Check if match
    const match = card1Value === card2Value;

    if (match) {
        // Add to flipped pairs
        flippedPairs.push(cardIndex1, cardIndex2);
    }

    const pairsFound = flippedPairs.length / 2;
    const pairsRemaining = config.totalPairs - pairsFound;
    const gameOver = pairsRemaining === 0;

    return {
        match,
        cardValue: match ? card1Value : undefined,
        card1Value: !match ? card1Value : undefined,
        card2Value: !match ? card2Value : undefined,
        pairsFound,
        pairsRemaining,
        moves: sessionData.moves, // SERVER-TRACKED
        gameOver,
    };
}

/**
 * Get resumable game state (for GET /session endpoint)
 * @param {object} sessionData - Current session data
 * @returns {object} resumable state
 */
function getResumableState(sessionData) {
    const { config, flippedPairs, moves } = sessionData;

    return {
        gridSize: config.gridSize,
        totalPairs: config.totalPairs,
        pairsFound: flippedPairs.length / 2,
        pairsRemaining: config.totalPairs - flippedPairs.length / 2,
        moves,
        maxTime: config.maxTime,
        flippedIndices: flippedPairs, // Client can use this to show matched cards
    };
}

module.exports = {
    getConfig,
    generateCards,
    createInitialSessionData,
    processFlip,
    getResumableState,
    GAME_CONFIGS,
};
