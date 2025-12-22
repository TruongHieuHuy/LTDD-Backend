/**
 * Achievements Checker Helper
 * Automatically checks and unlocks achievements for a user
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check and unlock achievements for a user
 * @param {string} userId - User ID to check achievements for
 * @returns {Promise<Object>} Result with newly unlocked achievements
 */
async function checkAchievements(userId) {
  try {
    // Fetch user data with all relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gameScores: true,
        friendships1: true,
        friendships2: true,
        posts: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate user stats
    const stats = {
      total_games: user.totalGamesPlayed,
      total_score: user.totalScore,
      friends_count: user.friendships1.length + user.friendships2.length,
      posts_count: user.posts.length,
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

    return {
      success: true,
      newlyUnlocked,
      totalChecked: achievements.length,
      totalUpdated: updates.length,
    };
  } catch (error) {
    console.error('Check achievements error:', error);
    throw error;
  }
}

module.exports = checkAchievements;
