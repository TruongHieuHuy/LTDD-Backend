const express = require('express');
const { authenticateToken: authenticate } = require('../../middleware/auth');
const sessionManager = require('../../utils/game-logic/session-manager');
const cowsBullsLogic = require('../../utils/game-logic/cows-bulls-logic');
const scoring = require('../../utils/game-logic/scoring');

const router = express.Router();

/**
 * POST /api/games/cows-bulls/start
 * Start a new Cows & Bulls game session
 */
router.post('/start', authenticate, async (req, res) => {
    try {
        const { difficulty = 'medium' } = req.body;

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

        const sessionData = cowsBullsLogic.createInitialSessionData(difficulty);
        const config = cowsBullsLogic.getConfig(difficulty);

        const session = await sessionManager.createSession(
            req.userId,
            'cows_bulls',
            difficulty,
            sessionData
        );

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                difficulty,
                maxAttempts: config.maxAttempts,
            },
            meta: {
                gameType: 'cows_bulls',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Cows Bulls start error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to start game' },
        });
    }
});

/**
 * POST /api/games/cows-bulls/guess
 * Submit a guess
 */
router.post('/guess', authenticate, async (req, res) => {
    try {
        const { sessionId, guess } = req.body;

        if (!sessionId || !guess) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'sessionId and guess are required',
                },
            });
        }

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        // Process guess (validates format automatically)
        const result = cowsBullsLogic.processGuess(sessionData, guess);

        await sessionManager.updateSession(sessionId, sessionData);

        // If game over, calculate final score
        if (result.gameOver) {
            let finalScore = 0;
            if (result.correct) {
                const timeSpent = sessionManager.calculateTimeSpent(session);
                finalScore = scoring.calculateCowsBullsScore(
                    result.attemptsUsed,
                    sessionData.config.maxAttempts,
                    sessionData.hintsUsed,
                    session.difficulty
                );

                await sessionManager.completeSession(sessionId, finalScore, { timeSpent });
            } else {
                await sessionManager.completeSession(sessionId, 0, {
                    timeSpent: sessionManager.calculateTimeSpent(session),
                });
            }

            return res.json({
                success: true,
                data: {
                    ...result,
                    score: finalScore,
                    timeSpent: sessionManager.calculateTimeSpent(session),
                },
                meta: {
                    sessionId,
                    gameType: 'cows_bulls',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        res.json({
            success: true,
            data: result,
            meta: {
                sessionId,
                gameType: 'cows_bulls',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Cows Bulls guess error:', error);

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
                message: error.message || 'Failed to process guess',
            },
        });
    }
});

/**
 * POST /api/games/cows-bulls/hint
 * Get a hint (reveals one digit)
 */
router.post('/hint', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'sessionId is required' },
            });
        }

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        const hintResult = cowsBullsLogic.getHint(sessionData);

        await sessionManager.updateSession(sessionId, sessionData);

        res.json({
            success: true,
            data: hintResult,
            meta: {
                sessionId,
                gameType: 'cows_bulls',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Cows Bulls hint error:', error);

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
                message: error.message || 'Failed to get hint',
            },
        });
    }
});

module.exports = router;
