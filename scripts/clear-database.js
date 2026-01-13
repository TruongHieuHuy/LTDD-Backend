const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
    console.log('🗑️  Clearing database...\n');

    try {
        // Delete in correct order (respecting foreign keys)
        console.log('   Deleting user achievements...');
        await prisma.userAchievement.deleteMany({});

        console.log('   Deleting achievements...');
        await prisma.achievement.deleteMany({});

        console.log('   Deleting game sessions...');
        await prisma.gameSession.deleteMany({});

        console.log('   Deleting challenges...');
        await prisma.challenge.deleteMany({});

        console.log('   Deleting saved posts...');
        await prisma.savedPost.deleteMany({});

        console.log('   Deleting comments...');
        await prisma.comment.deleteMany({});

        console.log('   Deleting likes...');
        await prisma.like.deleteMany({});

        console.log('   Deleting follows...');
        await prisma.follow.deleteMany({});

        console.log('   Deleting posts...');
        await prisma.post.deleteMany({});

        console.log('   Deleting messages...');
        await prisma.message.deleteMany({});

        console.log('   Deleting friendships...');
        await prisma.friendship.deleteMany({});

        console.log('   Deleting friend requests...');
        await prisma.friendRequest.deleteMany({});

        console.log('   Deleting game scores...');
        await prisma.gameScore.deleteMany({});

        console.log('   Deleting users...');
        await prisma.user.deleteMany({});

        console.log('\n✅ Database cleared successfully!');
        console.log('You can now run: node scripts/seed-database.js\n');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

clearDatabase();
