const express = require('express');
const { authenticateToken: authenticate } = require('../../middleware/auth');
const sessionManager = require('../../utils/game-logic/session-manager');
const guessNumberLogic = require('../../utils/game-logic/guess-number-logic');
const scoring = require('../../utils/game-logic/scoring');

const router = express.Router();

/**
 * POST /api/games/guess-number/start
 * Start a new Guess Number game session
 */
router.post('/start', authenticate, async (req, res) => {
    try {
        const { difficulty = 'medium' } = req.body;

        // Validate difficulty
        const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
        if (!validDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: `Difficulty must be one of: ${validDifficulties.join(', ')}`,
                },
            });
        }

        // Create initial session data
        const sessionData = guessNumberLogic.createInitialSessionData(difficulty);
        const config = guessNumberLogic.getConfig(difficulty);

        // Create session in database
        const session = await sessionManager.createSession(
            req.userId,
            'guess_number',
            difficulty,
            sessionData
        );

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                difficulty,
                maxAttempts: config.maxAttempts,
                range: { min: config.min, max: config.max },
            },
            meta: {
                gameType: 'guess_number',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Guess Number start error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to start game',
            },
        });
    }
});

/**
 * POST /api/games/guess-number/guess
 * Submit a guess
 */
router.post('/guess', authenticate, async (req, res) => {
    try {
        const { sessionId, guess } = req.body;

        if (!sessionId || guess === undefined) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'sessionId and guess are required',
                },
            });
        }

        // Validate and get session
        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        // Process guess
        const result = guessNumberLogic.processGuess(sessionData, parseInt(guess));

        // Update session
        await sessionManager.updateSession(sessionId, sessionData);

        // If game over, calculate final score and complete session
        if (result.gameOver) {
            let finalScore = 0;
            if (result.correct) {
                const timeSpent = sessionManager.calculateTimeSpent(session);
                finalScore = scoring.calculateGuessNumberScore(
                    result.attemptsUsed,
                    sessionData.config.maxAttempts,
                    session.difficulty
                );

                await sessionManager.completeSession(sessionId, finalScore, { timeSpent });
            } else {
                // Failed - no score
                await sessionManager.completeSession(sessionId, 0, {
                    timeSpent: sessionManager.calculateTimeSpent(session),
                });
            }

            return res.json({
                success: true,
                data: {
                    correct: result.correct,
                    gameOver: true,
                    score: finalScore,
                    attemptsUsed: result.attemptsUsed,
                    timeSpent: sessionManager.calculateTimeSpent(session),
                    secretNumber: result.secretNumber,
                },
                meta: {
                    sessionId,
                    gameType: 'guess_number',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Game still ongoing
        res.json({
            success: true,
            data: {
                correct: false,
                hint: result.hint,
                attemptsUsed: result.attemptsUsed,
                attemptsLeft: result.attemptsLeft,
                gameOver: false,
                score: null,
            },
            meta: {
                sessionId,
                gameType: 'guess_number',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Guess Number guess error:', error);

        if (
            error.message.includes('SESSION') ||
            error.message === 'UNAUTHORIZED'
        ) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.message,
                    message: error.message.replace(/_/g, ' ').toLowerCase(),
                },
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to process guess',
            },
        });
    }
});

/**
 * GET /api/games/guess-number/session/:sessionId
 * Get current session state (for resume)
 */
router.get('/session/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        const guesses = guessNumberLogic.extractGuessValues(sessionData.guesses);
        const hints = guessNumberLogic.extractHints(sessionData.guesses);

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                difficulty: session.difficulty,
                attemptsUsed: sessionData.guesses.length,
                attemptsLeft: sessionData.config.maxAttempts - sessionData.guesses.length,
                range: { min: sessionData.config.min, max: sessionData.config.max },
                previousGuesses: guesses,
                hints: hints,
            },
            meta: {
                gameType: 'guess_number',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Guess Number session error:', error);

        if (error.message.includes('SESSION') || error.message === 'UNAUTHORIZED') {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.message,
                    message: error.message.replace(/_/g, ' ').toLowerCase(),
                },
            });
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to get session',
            },
        });
    }
});

module.exports = router;
