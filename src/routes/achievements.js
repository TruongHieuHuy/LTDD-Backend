/**
 * Achievements Routes
 * Gamification system with badges and rewards
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken: authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// ==================== GET ALL ACHIEVEMENTS ====================
/**
 * GET /api/achievements
 * Get all achievements with optional category filter
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    const where = {};
    if (category) where.category = category;

    const achievements = await prisma.achievement.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: { achievements },
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements',
    });
  }
});

// ==================== GET USER ACHIEVEMENTS ====================
/**
 * GET /api/achievements/user/:userId
 * Get achievements for a specific user (with progress and unlock status)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all achievements
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
      ],
    });

    // Get user's achievement progress
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });

    // Create a map of user achievements
    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    // Combine all achievements with user's progress
    const achievementsWithProgress = allAchievements.map(achievement => {
      const userAchievement = userAchievementMap.get(achievement.id);

      return {
        ...achievement,
        progress: userAchievement?.progress || 0,
        isUnlocked: userAchievement?.isUnlocked || false,
        unlockedAt: userAchievement?.unlockedAt || null,
      };
    });

    // Calculate stats
    const stats = {
      total: allAchievements.length,
      unlocked: userAchievements.filter(ua => ua.isUnlocked).length,
      totalPoints: userAchievements
        .filter(ua => ua.isUnlocked)
        .reduce((sum, ua) => sum + ua.achievement.points, 0),
    };

    res.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        stats,
      },
    });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user achievements',
    });
  }
});

// ==================== CHECK AND UNLOCK ACHIEVEMENTS ====================
/**
 * POST /api/achievements/check
 * Check and unlock achievements for the authenticated user
 * This should be called after significant user actions (game completion, new friend, etc.)
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gameScores: true,
        friendships1: true,
        friendships2: true,
        posts: true,
        likes: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate user stats
    const stats = {
      total_games: user.totalGamesPlayed,
      total_score: user.totalScore,
      friends_count: user.friendships1.length + user.friendships2.length,
      posts_count: user.posts.length,
      total_likes_received: user.posts.reduce((sum, post) => sum + post.likeCount, 0),
    };

    // Calculate game-specific stats
    const gameStats = {};
    user.gameScores.forEach(score => {
      if (!gameStats[score.gameType]) {
        gameStats[score.gameType] = { highScore: 0, count: 0 };
      }
      gameStats[score.gameType].highScore = Math.max(
        gameStats[score.gameType].highScore,
        score.score
      );
      gameStats[score.gameType].count++;
    });

    // Calculate difficulty stats
    const difficultyStats = {};
    user.gameScores.forEach(score => {
      difficultyStats[score.difficulty] = (difficultyStats[score.difficulty] || 0) + 1;
    });

    // Get all achievements
    const achievements = await prisma.achievement.findMany();

    // Get existing user achievements
    const existingUserAchievements = await prisma.userAchievement.findMany({
      where: { userId },
    });

    const existingMap = new Map(
      existingUserAchievements.map(ua => [ua.achievementId, ua])
    );

    const newlyUnlocked = [];
    const updates = [];

    for (const achievement of achievements) {
      const existing = existingMap.get(achievement.id);
      const req = achievement.requirement;

      let progress = 0;
      let isUnlocked = false;

      // Calculate progress based on requirement type
      switch (req.type) {
        case 'total_games':
          progress = Math.min(100, Math.round((stats.total_games / req.value) * 100));
          isUnlocked = stats.total_games >= req.value;
          break;

        case 'total_score':
          progress = Math.min(100, Math.round((stats.total_score / req.value) * 100));
          isUnlocked = stats.total_score >= req.value;
          break;

        case 'game_high_score':
          const gameHighScore = gameStats[req.gameType]?.highScore || 0;
          progress = Math.min(100, Math.round((gameHighScore / req.value) * 100));
          isUnlocked = gameHighScore >= req.value;
          break;

        case 'friends_count':
          progress = Math.min(100, Math.round((stats.friends_count / req.value) * 100));
          isUnlocked = stats.friends_count >= req.value;
          break;

        case 'posts_count':
          progress = Math.min(100, Math.round((stats.posts_count / req.value) * 100));
          isUnlocked = stats.posts_count >= req.value;
          break;

        case 'total_likes_received':
          progress = Math.min(100, Math.round((stats.total_likes_received / req.value) * 100));
          isUnlocked = stats.total_likes_received >= req.value;
          break;

        case 'games_by_difficulty':
          const difficultyCount = difficultyStats[req.difficulty] || 0;
          progress = Math.min(100, Math.round((difficultyCount / req.value) * 100));
          isUnlocked = difficultyCount >= req.value;
          break;

        default:
          continue;
      }

      // Create or update user achievement
      if (!existing) {
        updates.push(
          prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              progress,
              isUnlocked,
              unlockedAt: isUnlocked ? new Date() : null,
            },
          })
        );

        if (isUnlocked) {
          newlyUnlocked.push(achievement);
        }
      } else if (!existing.isUnlocked && isUnlocked) {
        updates.push(
          prisma.userAchievement.update({
            where: { id: existing.id },
            data: {
              progress,
              isUnlocked: true,
              unlockedAt: new Date(),
            },
          })
        );

        newlyUnlocked.push(achievement);
      } else if (existing.progress !== progress) {
        updates.push(
          prisma.userAchievement.update({
            where: { id: existing.id },
            data: { progress },
          })
        );
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    res.json({
      success: true,
      message: `Checked ${achievements.length} achievements`,
      data: {
        newlyUnlocked,
        totalChecked: achievements.length,
        totalUpdated: updates.length,
      },
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check achievements',
    });
  }
});

// ==================== GET ACHIEVEMENT STATS ====================
/**
 * GET /api/achievements/stats
 * Get achievement statistics for authenticated user
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });

    const totalAchievements = await prisma.achievement.count();
    const unlockedCount = userAchievements.filter(ua => ua.isUnlocked).length;
    const totalPoints = userAchievements
      .filter(ua => ua.isUnlocked)
      .reduce((sum, ua) => sum + ua.achievement.points, 0);

    // Group by category
    const byCategory = {};
    userAchievements.forEach(ua => {
      const category = ua.achievement.category;
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, unlocked: 0, points: 0 };
      }
      byCategory[category].total++;
      if (ua.isUnlocked) {
        byCategory[category].unlocked++;
        byCategory[category].points += ua.achievement.points;
      }
    });

    res.json({
      success: true,
      data: {
        total: totalAchievements,
        unlocked: unlockedCount,
        locked: totalAchievements - unlockedCount,
        completionPercentage: Math.round((unlockedCount / totalAchievements) * 100),
        totalPoints,
        byCategory,
        recentlyUnlocked: userAchievements
          .filter(ua => ua.isUnlocked)
          .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
          .slice(0, 5)
          .map(ua => ({
            ...ua.achievement,
            unlockedAt: ua.unlockedAt,
          })),
      },
    });
  } catch (error) {
    console.error('Get achievement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievement stats',
    });
  }
});

module.exports = router;
