const express = require('express');
const { authenticateToken: authenticate } = require('../../middleware/auth');
const sessionManager = require('../../utils/game-logic/session-manager');
const quickMathLogic = require('../../utils/game-logic/quick-math-logic');
const scoring = require('../../utils/game-logic/scoring');

const router = express.Router();

/**
 * POST /api/games/quick-math/start
 * Start a new Quick Math game session
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

        const sessionData = quickMathLogic.createInitialSessionData(difficulty);

        const session = await sessionManager.createSession(
            req.userId,
            'quick_math',
            difficulty,
            sessionData
        );

        // Return only the first question (don't send all questions)
        const firstQuestion = sessionData.questions[0];

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                totalQuestions: sessionData.config.questionCount,
                timeLimit: sessionData.config.maxTime,
                currentQuestion: {
                    id: firstQuestion.id,
                    question: firstQuestion.question,
                    questionStartedAt: firstQuestion.startedAt,
                },
            },
            meta: {
                gameType: 'quick_math',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Quick Math start error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to start game' },
        });
    }
});

/**
 * POST /api/games/quick-math/answer
 * Submit an answer to a question
 */
router.post('/answer', authenticate, async (req, res) => {
    try {
        const { sessionId, questionId, answer } = req.body;

        if (!sessionId || questionId === undefined || answer === undefined) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'sessionId, questionId, and answer are required',
                },
            });
        }

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        // Process answer (server calculates timing)
        const result = quickMathLogic.processAnswer(sessionData, questionId, answer, scoring);

        // Anti-cheat: flag suspicious timing
        if (result.suspiciousFlag) {
            await sessionManager.flagSuspiciousActivity(sessionId, result.suspiciousFlag);
        }

        await sessionManager.updateSession(sessionId, sessionData);

        // If game over, complete session
        if (result.gameOver) {
            const timeSpent = sessionManager.calculateTimeSpent(session);
            const finalScore = scoring.calculateQuickMathTotalScore(
                sessionData.questions.map((q) => q.score),
                session.difficulty
            );

            await sessionManager.completeSession(sessionId, finalScore, { timeSpent });

            return res.json({
                success: true,
                data: {
                    correct: result.correct,
                    correctAnswer: result.correctAnswer,
                    questionScore: result.questionScore,
                    totalScore: finalScore,
                    questionsCompleted: result.questionsCompleted,
                    gameOver: true,
                    timeSpent,
                },
                meta: {
                    sessionId,
                    gameType: 'quick_math',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Return result with next question
        res.json({
            success: true,
            data: {
                correct: result.correct,
                correctAnswer: result.correctAnswer,
                questionScore: result.questionScore,
                totalScore: result.totalScore,
                questionsCompleted: result.questionsCompleted,
                questionsRemaining: result.questionsRemaining,
                nextQuestion: result.nextQuestion,
                gameOver: false,
            },
            meta: {
                sessionId,
                gameType: 'quick_math',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Quick Math answer error:', error);

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
                message: error.message || 'Failed to process answer',
            },
        });
    }
});

/**
 * GET /api/games/quick-math/session/:sessionId
 * Get current session state (for resume)
 */
router.get('/session/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await sessionManager.getSession(sessionId, req.userId);
        const sessionData = session.sessionData;

        const currentState = quickMathLogic.getCurrentQuestion(sessionData);

        res.json({
            success: true,
            data: currentState,
            meta: {
                sessionId,
                gameType: 'quick_math',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Quick Math session error:', error);

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
