/**
 * Shared Scoring Utilities for Games
 * Provides consistent scoring algorithms across all games
 */

// Difficulty multipliers
const DIFFICULTY_MULTIPLIERS = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    expert: 2.5,
};

/**
 * Get difficulty multiplier
 * @param {string} difficulty - easy|medium|hard|expert
 * @returns {number} multiplier
 */
function getDifficultyMultiplier(difficulty) {
    return DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
}

/**
 * Calculate score for Guess Number game
 * @param {number} attemptsUsed - Number of attempts used
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {string} difficulty - Difficulty level
 * @param {number} baseScore - Base score (default 1000)
 * @returns {number} final score
 */
function calculateGuessNumberScore(attemptsUsed, maxAttempts, difficulty, baseScore = 1000) {
    const efficiency = (maxAttempts - attemptsUsed) / maxAttempts;
    const multiplier = getDifficultyMultiplier(difficulty);
    return Math.floor(baseScore * efficiency * multiplier);
}

/**
 * Calculate score for Cows & Bulls game
 * @param {number} attemptsUsed - Number of attempts used
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} hintsUsed - Number of hints used
 * @param {string} difficulty - Difficulty level
 * @param {number} baseScore - Base score (default 5000)
 * @param {number} hintPenalty - Penalty per hint (default 500)
 * @returns {number} final score
 */
function calculateCowsBullsScore(
    attemptsUsed,
    maxAttempts,
    hintsUsed,
    difficulty,
    baseScore = 5000,
    hintPenalty = 500
) {
    const efficiency = 1 - attemptsUsed / maxAttempts;
    const multiplier = getDifficultyMultiplier(difficulty);
    const score = baseScore * efficiency * multiplier - hintsUsed * hintPenalty;
    return Math.floor(Math.max(0, score));
}

/**
 * Calculate score for Memory Match game
 * @param {number} pairsCount - Number of pairs in game
 * @param {number} moves - Moves used
 * @param {number} minMoves - Minimum possible moves (= pairsCount)
 * @param {number} timeSpent - Time spent in seconds
 * @param {number} maxTime - Maximum time allowed
 * @param {string} difficulty - Difficulty level
 * @param {number} baseScorePerPair - Base score per pair (default 125)
 * @returns {object} { score, breakdown: { baseScore, timeBonus, moveBonus } }
 */
function calculateMemoryMatchScore(
    pairsCount,
    moves,
    minMoves,
    timeSpent,
    maxTime,
    difficulty,
    baseScorePerPair = 125
) {
    const baseScore = baseScorePerPair * pairsCount;
    const timeRemaining = Math.max(0, maxTime - timeSpent);
    const timeBonus = Math.floor((timeRemaining / maxTime) * 1000);
    const moveBonus = Math.max(0, (minMoves - moves) * 50);
    const multiplier = getDifficultyMultiplier(difficulty);

    const totalScore = Math.floor((baseScore + timeBonus + moveBonus) * multiplier);

    return {
        score: totalScore,
        breakdown: {
            baseScore,
            timeBonus,
            moveBonus,
        },
    };
}

/**
 * Calculate score for Quick Math question
 * @param {boolean} correct - Whether answer was correct
 * @param {number} timeTaken - Time taken in seconds
 * @param {number} baseScore - Base score per question (default 100)
 * @param {number} maxTimeForBonus - Max time to get bonus (default 5s)
 * @returns {number} question score
 */
function calculateQuickMathQuestionScore(
    correct,
    timeTaken,
    baseScore = 100,
    maxTimeForBonus = 5
) {
    if (!correct) return 0;

    const timeBonus = Math.max(0, Math.floor((maxTimeForBonus - timeTaken) * 10));
    return baseScore + timeBonus;
}

/**
 * Calculate total score for Quick Math game
 * @param {Array<number>} questionScores - Array of individual question scores
 * @param {string} difficulty - Difficulty level
 * @returns {number} total score
 */
function calculateQuickMathTotalScore(questionScores, difficulty) {
    const sum = questionScores.reduce((acc, score) => acc + score, 0);
    const multiplier = getDifficultyMultiplier(difficulty);
    return Math.floor(sum * multiplier);
}

/**
 * Validate time to detect cheating
 * @param {number} timeTaken - Time taken for action
 * @param {number} minExpectedTime - Minimum expected time
 * @returns {boolean} true if suspicious
 */
function isSuspiciousTime(timeTaken, minExpectedTime = 0.5) {
    return timeTaken < minExpectedTime;
}

module.exports = {
    getDifficultyMultiplier,
    calculateGuessNumberScore,
    calculateCowsBullsScore,
    calculateMemoryMatchScore,
    calculateQuickMathQuestionScore,
    calculateQuickMathTotalScore,
    isSuspiciousTime,
    DIFFICULTY_MULTIPLIERS,
};
