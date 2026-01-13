const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Helper: Generate random integer between min and max (inclusive)
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: Pick random item from array
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];

// Helper: Generate random date in the past N days
const randomPastDate = (daysAgo) => {
    const now = new Date();
    const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

// Sample data
const FIRST_NAMES = ['Minh', 'Huy', 'Phương', 'Anh', 'Duy', 'Linh', 'Tùng', 'Hà', 'Khoa', 'Trang'];
const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];
const GAME_TYPES = ['guess_number', 'cows_bulls', 'memory_match', 'quick_math', 'rubik', 'sudoku', 'caro', 'puzzle'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const POST_CONTENTS = [
    'Vừa phá kỷ lục cá nhân! 🎉',
    'Game này khó quá, ai có tips không? 🤔',
    'Challenge ai dám không? 💪',
    'Mới vào top 10 leaderboard! 🏆',
    'Streak 10 games liên tiếp! ⚡',
    'Cuối cùng cũng unlock achievement này! 🌟',
    'Game đêm nay ai online không? 🎮',
    'Perfect score! Ai beat được không? 😎',
    'Thua liên tiếp, cần động viên 😅',
    'Rubik cube solved in 2 minutes! 🎲'
];

async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // ==================== 1. CREATE USERS ====================
    console.log('👥 Creating 10 users...');
    const users = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (let i = 0; i < 10; i++) {
        const firstName = randomItem(FIRST_NAMES);
        const lastName = randomItem(LAST_NAMES);
        const username = `${firstName.toLowerCase()}${i + 1}`;
        const email = `${username}@gmail.com`;

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: i === 0 ? 'ADMIN' : 'USER',
                totalGamesPlayed: 0, // Will update later
                totalScore: 0, // Will update later
                coins: randomInt(500, 2000),
                createdAt: randomPastDate(90),
                lastLoginAt: randomPastDate(7),
            },
        });

        users.push(user);
        console.log(`   ✓ Created user: ${username} (${email})`);
    }

    console.log(`\n✅ Created ${users.length} users\n`);

    // ==================== 2. CREATE GAME SCORES ====================
    console.log('🎮 Creating game scores (5-15 games per user)...');
    let totalScores = 0;

    for (const user of users) {
        const numGames = randomInt(5, 15);
        let userTotalScore = 0;

        for (let i = 0; i < numGames; i++) {
            const gameType = randomItem(GAME_TYPES);
            const difficulty = randomItem(DIFFICULTIES);
            const score = randomInt(100, 5000);
            const timeSpent = randomInt(30, 600);

            await prisma.gameScore.create({
                data: {
                    userId: user.id,
                    gameType,
                    score,
                    difficulty,
                    attempts: randomInt(1, 5),
                    timeSpent,
                    gameData: {
                        moves: randomInt(10, 100),
                        hintsUsed: randomInt(0, 3),
                        perfectGame: Math.random() > 0.8,
                    },
                    createdAt: randomPastDate(60),
                },
            });

            userTotalScore += score;
            totalScores++;
        }

        // Update user stats
        await prisma.user.update({
            where: { id: user.id },
            data: {
                totalGamesPlayed: numGames,
                totalScore: userTotalScore,
            },
        });

        console.log(`   ✓ ${user.username}: ${numGames} games, ${userTotalScore} total score`);
    }

    console.log(`\n✅ Created ${totalScores} game scores\n`);

    // ==================== 3. CREATE FRIENDSHIPS ====================
    console.log('🤝 Creating friendships...');
    let friendshipCount = 0;

    // Create a network of friendships
    for (let i = 0; i < users.length; i++) {
        // Each user has 2-5 friends
        const numFriends = randomInt(2, 5);
        const friendIndices = new Set();

        while (friendIndices.size < numFriends && friendIndices.size < users.length - 1) {
            let friendIdx = randomInt(0, users.length - 1);
            if (friendIdx !== i) {
                friendIndices.add(friendIdx);
            }
        }

        for (const friendIdx of friendIndices) {
            const user1Id = users[i].id < users[friendIdx].id ? users[i].id : users[friendIdx].id;
            const user2Id = users[i].id < users[friendIdx].id ? users[friendIdx].id : users[i].id;

            try {
                await prisma.friendship.create({
                    data: {
                        userId1: user1Id,
                        userId2: user2Id,
                        createdAt: randomPastDate(60),
                    },
                });
                friendshipCount++;
            } catch (e) {
                // Friendship already exists, skip
            }
        }
    }

    console.log(`✅ Created ${friendshipCount} friendships\n`);

    // ==================== 4. CREATE FRIEND REQUESTS (some pending) ====================
    console.log('📨 Creating friend requests...');
    let requestCount = 0;

    for (let i = 0; i < 5; i++) {
        const sender = randomItem(users);
        const receiver = randomItem(users.filter(u => u.id !== sender.id));

        try {
            await prisma.friendRequest.create({
                data: {
                    senderId: sender.id,
                    receiverId: receiver.id,
                    status: randomItem(['pending', 'pending', 'accepted']),
                    message: 'Kết bạn nhé!',
                    sentAt: randomPastDate(30),
                },
            });
            requestCount++;
        } catch (e) {
            // Duplicate, skip
        }
    }

    console.log(`✅ Created ${requestCount} friend requests\n`);

    // ==================== 5. CREATE MESSAGES ====================
    console.log('💬 Creating messages...');
    const messages = [
        'Chơi game không?',
        'Online chưa?',
        'Tips game này đi!',
        'Gg wp!',
        'Thử game mới chưa?',
        'Challenge tao đi!',
        'Đợi tao đây!',
        'Thua rồi 😭',
        'Ez game!',
        'GG bro!'
    ];
    let messageCount = 0;

    for (let i = 0; i < 50; i++) {
        const sender = randomItem(users);
        const receiver = randomItem(users.filter(u => u.id !== sender.id));

        await prisma.message.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                content: randomItem(messages),
                type: 'text',
                isRead: Math.random() > 0.3,
                sentAt: randomPastDate(30),
            },
        });
        messageCount++;
    }

    console.log(`✅ Created ${messageCount} messages\n`);

    // ==================== 6. CREATE POSTS ====================
    console.log('📝 Creating posts...');
    let postCount = 0;
    const createdPosts = [];

    for (const user of users) {
        const numPosts = randomInt(1, 5);

        for (let i = 0; i < numPosts; i++) {
            const post = await prisma.post.create({
                data: {
                    userId: user.id,
                    content: randomItem(POST_CONTENTS),
                    visibility: randomItem(['public', 'public', 'public', 'friends']),
                    category: Math.random() > 0.3 ? randomItem(GAME_TYPES) : null,
                    likeCount: 0, // Will update
                    commentCount: 0, // Will update
                    shareCount: randomInt(0, 10),
                    createdAt: randomPastDate(60),
                },
            });
            createdPosts.push(post);
            postCount++;
        }
    }

    console.log(`✅ Created ${postCount} posts\n`);

    // ==================== 7. CREATE LIKES ====================
    console.log('❤️ Creating likes...');
    let likeCount = 0;

    for (const post of createdPosts) {
        const numLikes = randomInt(0, 8);
        const likers = new Set();

        while (likers.size < numLikes && likers.size < users.length) {
            const liker = randomItem(users);
            if (!likers.has(liker.id)) {
                try {
                    await prisma.like.create({
                        data: {
                            postId: post.id,
                            userId: liker.id,
                            createdAt: randomPastDate(50),
                        },
                    });
                    likers.add(liker.id);
                    likeCount++;
                } catch (e) {
                    // Duplicate like
                }
            }
        }

        // Update post like count
        await prisma.post.update({
            where: { id: post.id },
            data: { likeCount: likers.size },
        });
    }

    console.log(`✅ Created ${likeCount} likes\n`);

    // ==================== 8. CREATE COMMENTS ====================
    console.log('💬 Creating comments...');
    const commentTexts = [
        'Hay quá!',
        'Pro!',
        'Chia sẻ tips đi bro',
        'Ủa sao được vậy?',
        'Dạy em với!',
        'GG!',
        'Impressive!',
        'Wow!',
        'How???',
        'Nice!'
    ];
    let commentCount = 0;

    for (const post of createdPosts) {
        const numComments = randomInt(0, 5);

        for (let i = 0; i < numComments; i++) {
            const commenter = randomItem(users);

            await prisma.comment.create({
                data: {
                    postId: post.id,
                    userId: commenter.id,
                    content: randomItem(commentTexts),
                    createdAt: randomPastDate(50),
                },
            });
            commentCount++;
        }

        // Update post comment count
        await prisma.post.update({
            where: { id: post.id },
            data: { commentCount: numComments },
        });
    }

    console.log(`✅ Created ${commentCount} comments\n`);

    // ==================== 9. CREATE CHALLENGES ====================
    console.log('⚔️ Creating challenges...');
    let challengeCount = 0;

    // Create 10 challenges with different states
    for (let i = 0; i < 10; i++) {
        const creator = randomItem(users);
        const opponent = randomItem(users.filter(u => u.id !== creator.id));
        const betAmount = randomInt(10, 500);
        const status = randomItem(['PENDING', 'ACTIVE', 'COMPLETED', 'COMPLETED']);

        const challengeData = {
            creatorId: creator.id,
            betAmount,
            status,
            createdAt: randomPastDate(30),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        };

        if (status !== 'PENDING') {
            challengeData.opponentId = opponent.id;
            challengeData.acceptedAt = randomPastDate(25);

            // Add game types and votes
            challengeData.game1Type = randomItem(GAME_TYPES);
            challengeData.game1CreatorVote = randomItem(GAME_TYPES);
            challengeData.game1OpponentVote = randomItem(GAME_TYPES);

            if (status === 'COMPLETED') {
                challengeData.game1Completed = true;
                challengeData.game1CreatorScore = randomInt(100, 1000);
                challengeData.game1OpponentScore = randomInt(100, 1000);

                // Determine winner
                if (challengeData.game1CreatorScore > challengeData.game1OpponentScore) {
                    challengeData.creatorWins = 1;
                    challengeData.winnerId = creator.id;
                } else if (challengeData.game1OpponentScore > challengeData.game1CreatorScore) {
                    challengeData.opponentWins = 1;
                    challengeData.winnerId = opponent.id;
                } else {
                    challengeData.isDraw = true;
                }

                challengeData.completedAt = randomPastDate(20);
            }
        }

        await prisma.challenge.create({ data: challengeData });
        challengeCount++;
    }

    console.log(`✅ Created ${challengeCount} challenges\n`);

    // ==================== 10. CREATE ACHIEVEMENTS ====================
    console.log('🏆 Creating achievements...');
    const achievementTemplates = [
        { name: 'First Steps', description: 'Play your first game', icon: '👶', category: 'general', requirement: { type: 'total_games', value: 1 }, points: 10 },
        { name: 'Rookie Player', description: 'Play 10 games', icon: '🎮', category: 'general', requirement: { type: 'total_games', value: 10 }, points: 25 },
        { name: 'Veteran', description: 'Play 50 games', icon: '⭐', category: 'general', requirement: { type: 'total_games', value: 50 }, points: 100 },
        { name: 'Score Master', description: 'Reach 10,000 total score', icon: '💯', category: 'milestone', requirement: { type: 'total_score', value: 10000 }, points: 50 },
        { name: 'Sudoku Pro', description: 'Score 1000+ in Sudoku', icon: '🔢', category: 'games', requirement: { type: 'game_score', gameType: 'sudoku', value: 1000 }, points: 30 },
        { name: 'Rubik Solver', description: 'Solve Rubik cube', icon: '🎲', category: 'games', requirement: { type: 'game_complete', gameType: 'rubik' }, points: 40 },
        { name: 'Social Butterfly', description: 'Make 5 friends', icon: '🦋', category: 'social', requirement: { type: 'friends', value: 5 }, points: 20 },
        { name: 'Popular', description: 'Get 50 post likes', icon: '❤️', category: 'social', requirement: { type: 'post_likes', value: 50 }, points: 30 },
    ];

    const achievements = [];
    for (const template of achievementTemplates) {
        const achievement = await prisma.achievement.create({
            data: {
                ...template,
                order: achievements.length,
            },
        });
        achievements.push(achievement);
    }

    console.log(`✅ Created ${achievements.length} achievements\n`);

    // ==================== 11. ASSIGN USER ACHIEVEMENTS ====================
    console.log('🎖️ Assigning achievements to users...');
    let userAchievementCount = 0;

    for (const user of users) {
        const numAchievements = randomInt(1, 4);

        for (let i = 0; i < numAchievements; i++) {
            const achievement = achievements[i];
            const isUnlocked = Math.random() > 0.3;

            try {
                await prisma.userAchievement.create({
                    data: {
                        userId: user.id,
                        achievementId: achievement.id,
                        progress: isUnlocked ? 100 : randomInt(20, 80),
                        isUnlocked: isUnlocked,
                        unlockedAt: isUnlocked ? randomPastDate(40) : null,
                    },
                });
                userAchievementCount++;
            } catch (e) {
                // Duplicate
            }
        }
    }

    console.log(`✅ Created ${userAchievementCount} user achievements\n`);

    // ==================== 12. CREATE SAVED POSTS ====================
    console.log('🔖 Creating saved posts...');
    let savedCount = 0;

    for (const user of users) {
        const numSaved = randomInt(0, 3);
        for (let i = 0; i < numSaved; i++) {
            const post = randomItem(createdPosts);
            try {
                await prisma.savedPost.create({
                    data: {
                        userId: user.id,
                        postId: post.id,
                        savedAt: randomPastDate(30),
                    },
                });
                savedCount++;
            } catch (e) {
                // Duplicate
            }
        }
    }

    console.log(`✅ Created ${savedCount} saved posts\n`);

    // ==================== 13. CREATE GAME SESSIONS ====================
    console.log('🎯 Creating game sessions...');
    let sessionCount = 0;

    for (const user of users) {
        const numSessions = randomInt(2, 5);

        for (let i = 0; i < numSessions; i++) {
            const gameType = randomItem(GAME_TYPES);
            const difficulty = randomItem(DIFFICULTIES);
            const isCompleted = Math.random() > 0.2;

            await prisma.gameSession.create({
                data: {
                    userId: user.id,
                    gameType,
                    difficulty,
                    sessionData: {
                        currentState: 'in_progress',
                        moves: randomInt(5, 50),
                    },
                    status: isCompleted ? 'COMPLETED' : 'ACTIVE',
                    startedAt: randomPastDate(7),
                    completedAt: isCompleted ? randomPastDate(7) : null,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
                    score: isCompleted ? randomInt(100, 2000) : null,
                    moves: isCompleted ? randomInt(10, 100) : null,
                    timeSpent: isCompleted ? randomInt(60, 600) : null,
                },
            });
            sessionCount++;
        }
    }

    console.log(`✅ Created ${sessionCount} game sessions\n`);

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🎮 Game Scores: ${totalScores}`);
    console.log(`   🤝 Friendships: ${friendshipCount}`);
    console.log(`   📨 Friend Requests: ${requestCount}`);
    console.log(`   💬 Messages: ${messageCount}`);
    console.log(`   📝 Posts: ${postCount}`);
    console.log(`   ❤️ Likes: ${likeCount}`);
    console.log(`   💬 Comments: ${commentCount}`);
    console.log(`   ⚔️ Challenges: ${challengeCount}`);
    console.log(`   🏆 Achievements: ${achievements.length}`);
    console.log(`   🎖️ User Achievements: ${userAchievementCount}`);
    console.log(`   🔖 Saved Posts: ${savedCount}`);
    console.log(`   🎯 Game Sessions: ${sessionCount}`);
    console.log(`\n✅ All tables now have realistic, valid data!`);
    console.log(`\n🔐 Login credentials (all same password):`);
    console.log(`   Email: minh1@gmail.com ... trang10@gmail.com`);
    console.log(`   Password: password123\n`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
