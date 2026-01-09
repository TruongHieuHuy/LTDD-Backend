const express = require('express');
const { authenticateToken: authenticate } = require('../../middleware/auth');
const sessionManager = require('../../utils/game-logic/session-manager');
const memoryMatchLogic = require('../../utils/game-logic/memory-match-logic');
const scoring = require('../../utils/game-logic/scoring');

const router = express.Router();

/**
 * POST /api/games/memory-match/start
 * Start a new Memory Match game session
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

        const sessionData = memoryMatchLogic.createInitialSessionData(difficulty);

        const session = await sessionManager.createSession(
            req.userId,
            'memory_match',
            difficulty,
            sessionData
        );

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                gridSize: sessionData.config.gridSize,
                totalPairs: sessionData.config.totalPairs,
                cards: sessionData.cards, // Shuffled card IDs
                maxTime: sessionData.config.maxTime,
            },
            meta: {
                gameType: 'memory_match',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Memory Match start error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to start game' },
        });
    }
});

/**
 * POST /api/games/memory-match/flip
 * Flip two cards
 */
router.post('/flip', authenticate, async (req, res) => {
    try {
        const { sessionId, cardIndex1, cardIndex2 } = req.body;

        if (sessionId === undefined || cardIndex1 === undefined || cardIndex2 === undefined) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'sessionId, cardIndex1, and cardIndex2 are required',
                },
            });
        }

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        // Process flip (server tracks moves automatically)
        const result = memoryMatchLogic.processFlip(sessionData, cardIndex1, cardIndex2);

        await sessionManager.updateSession(sessionId, sessionData, {
            moves: sessionData.moves, // Update moves in database
        });

        res.json({
            success: true,
            data: result,
            meta: {
                sessionId,
                gameType: 'memory_match',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Memory Match flip error:', error);

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
                message: error.message || 'Failed to process flip',
            },
        });
    }
});

/**
 * POST /api/games/memory-match/complete
 * Complete the game (calculate final score)
 */
router.post('/complete', authenticate, async (req, res) => {
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

        // SERVER-CALCULATED time and moves (no trust in client)
        const timeSpent = sessionManager.calculateTimeSpent(session);
        const moves = sessionData.moves; // Tracked by server

        const config = memoryMatchLogic.getConfig(session.difficulty);

        // Calculate score
        const scoreResult = scoring.calculateMemoryMatchScore(
            config.pairs,
            moves,
            config.pairs, // minMoves = pairsCount
            timeSpent,
            config.maxTime,
            session.difficulty
        );

        // Calculate stars (1-3 based on performance)
        let stars = 1;
        if (scoreResult.score >= config.pairs * 200) {
            stars = 3;
        } else if (scoreResult.score >= config.pairs * 150) {
            stars = 2;
        }

        await sessionManager.completeSession(sessionId, scoreResult.score, {
            moves,
            timeSpent,
        });

        res.json({
            success: true,
            data: {
                score: scoreResult.score,
                moves,
                timeSpent,
                stars,
                breakdown: scoreResult.breakdown,
            },
            meta: {
                sessionId,
                gameType: 'memory_match',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Memory Match complete error:', error);

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
                message: error.message || 'Failed to complete game',
            },
        });
    }
});

module.exports = router;
