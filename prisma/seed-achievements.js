const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAchievements() {
  console.log('🌱 Seeding achievements...');

  const achievements = [
    // ==================== GENERAL ACHIEVEMENTS ====================
    {
      name: 'First Steps',
      description: 'Play your first game',
      icon: '👶',
      category: 'general',
      requirement: { type: 'total_games', value: 1 },
      points: 10,
      order: 1,
    },
    {
      name: 'Getting Started',
      description: 'Play 10 games',
      icon: '🎮',
      category: 'general',
      requirement: { type: 'total_games', value: 10 },
      points: 25,
      order: 2,
    },
    {
      name: 'Game Enthusiast',
      description: 'Play 50 games',
      icon: '🎯',
      category: 'general',
      requirement: { type: 'total_games', value: 50 },
      points: 50,
      order: 3,
    },
    {
      name: 'Game Master',
      description: 'Play 100 games',
      icon: '🏆',
      category: 'general',
      requirement: { type: 'total_games', value: 100 },
      points: 100,
      order: 4,
    },
    {
      name: 'Legend',
      description: 'Play 500 games',
      icon: '👑',
      category: 'general',
      requirement: { type: 'total_games', value: 500 },
      points: 250,
      order: 5,
    },

    // ==================== SCORE ACHIEVEMENTS ====================
    {
      name: 'Score Beginner',
      description: 'Reach 1,000 total score',
      icon: '⭐',
      category: 'milestone',
      requirement: { type: 'total_score', value: 1000 },
      points: 20,
      order: 10,
    },
    {
      name: 'Score Hunter',
      description: 'Reach 5,000 total score',
      icon: '🌟',
      category: 'milestone',
      requirement: { type: 'total_score', value: 5000 },
      points: 50,
      order: 11,
    },
    {
      name: 'Score Champion',
      description: 'Reach 10,000 total score',
      icon: '✨',
      category: 'milestone',
      requirement: { type: 'total_score', value: 10000 },
      points: 100,
      order: 12,
    },
    {
      name: 'Score God',
      description: 'Reach 50,000 total score',
      icon: '💎',
      category: 'milestone',
      requirement: { type: 'total_score', value: 50000 },
      points: 500,
      order: 13,
    },

    // ==================== GAME-SPECIFIC ACHIEVEMENTS ====================
    {
      name: 'Sudoku Novice',
      description: 'Score 500 points in Sudoku',
      icon: '🧩',
      category: 'games',
      requirement: { type: 'game_high_score', gameType: 'sudoku', value: 500 },
      points: 30,
      order: 20,
    },
    {
      name: 'Sudoku Expert',
      description: 'Score 1,000 points in Sudoku',
      icon: '🎲',
      category: 'games',
      requirement: { type: 'game_high_score', gameType: 'sudoku', value: 1000 },
      points: 50,
      order: 21,
    },
    {
      name: 'Rubik Solver',
      description: 'Score 500 points in Rubik',
      icon: '🧊',
      category: 'games',
      requirement: { type: 'game_high_score', gameType: 'rubik', value: 500 },
      points: 30,
      order: 22,
    },
    {
      name: 'Caro Master',
      description: 'Score 500 points in Caro',
      icon: '⭕',
      category: 'games',
      requirement: { type: 'game_high_score', gameType: 'caro', value: 500 },
      points: 30,
      order: 23,
    },
    {
      name: 'Puzzle King',
      description: 'Score 500 points in Puzzle',
      icon: '🧩',
      category: 'games',
      requirement: { type: 'game_high_score', gameType: 'puzzle', value: 500 },
      points: 30,
      order: 24,
    },

    // ==================== SOCIAL ACHIEVEMENTS ====================
    {
      name: 'Social Butterfly',
      description: 'Make your first friend',
      icon: '🦋',
      category: 'social',
      requirement: { type: 'friends_count', value: 1 },
      points: 15,
      order: 30,
    },
    {
      name: 'Popular',
      description: 'Have 10 friends',
      icon: '👥',
      category: 'social',
      requirement: { type: 'friends_count', value: 10 },
      points: 50,
      order: 31,
    },
    {
      name: 'Influencer',
      description: 'Have 50 friends',
      icon: '🌟',
      category: 'social',
      requirement: { type: 'friends_count', value: 50 },
      points: 150,
      order: 32,
    },
    {
      name: 'First Post',
      description: 'Create your first post',
      icon: '📝',
      category: 'social',
      requirement: { type: 'posts_count', value: 1 },
      points: 10,
      order: 33,
    },
    {
      name: 'Content Creator',
      description: 'Create 10 posts',
      icon: '✍️',
      category: 'social',
      requirement: { type: 'posts_count', value: 10 },
      points: 50,
      order: 34,
    },
    {
      name: 'Viral',
      description: 'Get 100 likes on your posts',
      icon: '❤️',
      category: 'social',
      requirement: { type: 'total_likes_received', value: 100 },
      points: 100,
      order: 35,
    },

    // ==================== DIFFICULTY ACHIEVEMENTS ====================
    {
      name: 'Easy Champion',
      description: 'Complete 10 easy games',
      icon: '🥉',
      category: 'games',
      requirement: { type: 'games_by_difficulty', difficulty: 'easy', value: 10 },
      points: 25,
      order: 40,
    },
    {
      name: 'Medium Champion',
      description: 'Complete 10 medium games',
      icon: '🥈',
      category: 'games',
      requirement: { type: 'games_by_difficulty', difficulty: 'medium', value: 10 },
      points: 50,
      order: 41,
    },
    {
      name: 'Hard Champion',
      description: 'Complete 10 hard games',
      icon: '🥇',
      category: 'games',
      requirement: { type: 'games_by_difficulty', difficulty: 'hard', value: 10 },
      points: 100,
      order: 42,
    },
    {
      name: 'Expert Champion',
      description: 'Complete 10 expert games',
      icon: '💪',
      category: 'games',
      requirement: { type: 'games_by_difficulty', difficulty: 'expert', value: 10 },
      points: 200,
      order: 43,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const achievement of achievements) {
    try {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement,
      });
      created++;
      console.log(`✅ ${achievement.name}`);
    } catch (error) {
      console.log(`⏭️  ${achievement.name} (already exists)`);
      skipped++;
    }
  }

  console.log(`\n✨ Seeded ${created} achievements (${skipped} already existed)`);
}

async function main() {
  try {
    await seedAchievements();
  } catch (error) {
    console.error('Error seeding achievements:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
