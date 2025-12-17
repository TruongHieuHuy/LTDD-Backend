const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken: authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/scores
 * Save new game score
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { gameType, score, attempts, difficulty, timeSpent, gameData } = req.body;

    // Validate required fields
    if (!gameType || score === undefined || !difficulty) {
      return res.status(400).json({
        success: false,
        message: 'gameType, score, and difficulty are required',
      });
    }

    // Validate gameType enum
    const validGameTypes = ['rubik', 'sudoku', 'caro', 'puzzle'];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gameType. Must be one of: ${validGameTypes.join(', ')}`,
      });
    }

    // Validate difficulty enum
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`,
      });
    }

    // Create game score
    const gameScore = await prisma.gameScore.create({
      data: {
        userId: req.userId,
        gameType,
        score: parseInt(score),
        attempts: attempts ? parseInt(attempts) : 1,
        difficulty,
        timeSpent: timeSpent ? parseInt(timeSpent) : 0,
        gameData: gameData || null,
        syncedAt: new Date(),
      },
    });

    // Update user statistics
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        totalGamesPlayed: { increment: 1 },
        totalScore: { increment: parseInt(score) },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Score saved successfully',
      data: {
        score: gameScore,
      },
    });
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving score',
    });
  }
});

/**
 * GET /api/scores
 * Get user's game scores with filters
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { gameType, difficulty, limit = 50, offset = 0 } = req.query;

    // Build query filters
    const where = { userId: req.userId };
    if (gameType) where.gameType = gameType;
    if (difficulty) where.difficulty = difficulty;

    // Fetch scores
    const scores = await prisma.gameScore.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get total count
    const totalCount = await prisma.gameScore.count({ where });

    res.json({
      success: true,
      data: {
        scores,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching scores',
    });
  }
});

/**
 * GET /api/scores/leaderboard
 * Get global leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { gameType, difficulty, limit = 10 } = req.query;

    // Build query filters
    const where = {};
    if (gameType && gameType !== 'all') where.gameType = gameType;
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty;

    // Fetch top scores
    const leaderboard = await prisma.gameScore.findMany({
      where,
      orderBy: { score: 'desc' },
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        leaderboard,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard',
    });
  }
});

/**
 * GET /api/scores/stats
 * Get user statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await prisma.gameScore.groupBy({
      by: ['gameType'],
      where: { userId: req.userId },
      _count: { id: true },
      _max: { score: true },
      _avg: { score: true, timeSpent: true },
    });

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
    });
  }
});

module.exports = router;
