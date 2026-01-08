const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken: authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Scores
 *   description: Game scores management
 */

/**
 * @swagger
 * /api/scores:
 *   post:
 *     summary: Submit a new game score
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameType
 *               - difficulty
 *             properties:
 *               gameType:
 *                 type: string
 *                 enum: [rubik, sudoku, caro, puzzle]
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *               score:
 *                 type: integer
 *                 description: Required for non-Rubik games, or can be auto-calculated
 *               timeSpent:
 *                 type: integer
 *                 description: Seconds spent. Required for Rubik.
 *               moves:
 *                 type: integer
 *                 description: Moves count. Required for Rubik.
 *               attempts:
 *                 type: integer
 *                 default: 1
 *               gameData:
 *                 type: object
 *                 description: Additional JSON data
 *     responses:
 *       201:
 *         description: Score saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         score:
 *                           type: integer
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { gameType, score, attempts, difficulty, timeSpent, gameData, moves } = req.body;

    // Special handling for Rubik: Calculate score validation
    let calculatedScore = score;
    let finalGameData = gameData || {};

    if (gameType === 'rubik') {
      if (timeSpent === undefined || moves === undefined) {
        if (score === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Rubik game requires timeSpent and moves to calculate score',
          });
        }
      } else {
        // Calculate Rubik score server-side
        // Formula: Base (10000) - Time * 2 - Moves * 5
        // Multiplier: Easy(1), Medium(1.5), Hard(2), Expert(3)
        const diffMultipliers = {
          'easy': 1,
          'medium': 1.5,
          'hard': 2,
          'expert': 3
        };
        const multiplier = diffMultipliers[difficulty] || 1;

        let rawScore = 10000 - (parseInt(timeSpent) * 2) - (parseInt(moves) * 5);
        if (rawScore < 0) rawScore = 0;

        calculatedScore = Math.floor(rawScore * multiplier);

        // Store moves in gameData
        finalGameData = { ...finalGameData, moves: parseInt(moves) };
      }
    }

    // Validate request: require score if it wasn't calculated above
    if (!gameType || (calculatedScore === undefined && score === undefined) || !difficulty) {
      return res.status(400).json({
        success: false,
        message: 'gameType, score (or timeSpent/moves for rubik), and difficulty are required',
      });
    }

    // Validate gameType enum
    const validGameTypes = [
      'guess_number', 'cows_bulls', 'memory_match', 'quick_math',
      'rubik', 'sudoku', 'caro', 'puzzle'
    ];
    if (!validGameTypes.includes(gameType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gameType. Must be one of: ${validGameTypes.join(', ')}`,
      });
    }

    // Validate score range (general)
    if (score < 0 || score > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 0 and 1,000,000',
      });
    }

    // Game-specific maximum scores
    const maxScores = {
      guess_number: 10000,
      cows_bulls: 50000,
      quick_math: 99999,
      memory_match: 5000,
      rubik: 100000,
      sudoku: 100000,
      caro: 50000,
      puzzle: 50000,
    };

    const maxScore = maxScores[gameType] || 1000000;
    if (score > maxScore) {
      return res.status(400).json({
        success: false,
        message: `Score exceeds maximum (${maxScore}) for ${gameType}`,
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
        score: parseInt(calculatedScore),
        attempts: attempts ? parseInt(attempts) : 1,
        difficulty,
        timeSpent: timeSpent ? parseInt(timeSpent) : 0,
        gameData: finalGameData,
        syncedAt: new Date(),
      },
    });

    // Update user statistics
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        totalGamesPlayed: { increment: 1 },
        totalScore: { increment: parseInt(calculatedScore) },
      },
    });

    // Auto-check achievements after saving score
    // This will unlock any newly achieved badges
    try {
      // Import here to avoid circular dependency
      const checkAchievements = require('./achievements-checker');
      await checkAchievements(req.userId);
    } catch (error) {
      console.error('Achievement check failed (non-critical):', error.message);
      // Don't fail the score save if achievement check fails
    }

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
 * @swagger
 * /api/scores:
 *   get:
 *     summary: Get user scores
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of scores
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
 * @swagger
 * /api/scores/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Scores]
 *     parameters:
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Global leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const {
      gameType = 'all',
      difficulty,
      period = 'all-time',
      limit = 100
    } = req.query;

    // Build query filters
    const where = {};

    // Filter by game type
    if (gameType && gameType !== 'all') {
      where.gameType = gameType.toUpperCase();
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      where.difficulty = difficulty.toUpperCase();
    }

    // Filter by time period
    if (period !== 'all-time') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'weekly':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo;
          break;
        case 'monthly':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo;
          break;
        default:
          break; // all-time - no filter
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }

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
            totalScore: true,
            totalGamesPlayed: true
          },
        },
      },
    });

    // Add ranks
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    // Calculate personal rank if user is authenticated
    let personalRank = null;
    if (req.userId) {
      // Get user's best score with same filters
      const userBestScore = await prisma.gameScore.findFirst({
        where: {
          ...where,
          userId: req.userId
        },
        orderBy: { score: 'desc' }
      });

      if (userBestScore) {
        // Count how many scores are better
        const betterCount = await prisma.gameScore.count({
          where: {
            ...where,
            score: { gt: userBestScore.score }
          }
        });
        personalRank = betterCount + 1;
      }
    }

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        personalRank,
        filters: {
          gameType,
          period,
          difficulty: difficulty || null
        }
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
