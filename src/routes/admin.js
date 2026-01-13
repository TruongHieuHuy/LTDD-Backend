const express = require('express');
const { prisma } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 * Requires: ADMIN or MODERATOR role
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await prisma.user.count();

        // Get total games count (unique game types played)
        const gamesPlayed = await prisma.gameScore.groupBy({
            by: ['gameType'],
        });
        const totalGames = gamesPlayed.length;

        // Get total game sessions
        const totalGameSessions = await prisma.gameSession.count();

        // Get active challenges count
        const activeChallenges = await prisma.challenge.count({
            where: {
                status: {
                    in: ['PENDING', 'ACTIVE']
                }
            }
        });

        // Get total challenges
        const totalChallenges = await prisma.challenge.count();

        // Get total posts
        const totalPosts = await prisma.post.count();

        // Get total friendships
        const totalFriendships = await prisma.friendship.count();

        // Get users registered in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newUsersThisWeek = await prisma.user.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            }
        });

        // Get top games by play count
        const topGames = await prisma.gameScore.groupBy({
            by: ['gameType'],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 5
        });

        // Response
        res.json({
            success: true,
            data: {
                totalUsers,
                totalGames,
                totalGameSessions,
                activeChallenges,
                totalChallenges,
                totalPosts,
                totalFriendships,
                newUsersThisWeek,
                topGames: topGames.map(g => ({
                    gameType: g.gameType,
                    playCount: g._count.id
                }))
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching admin stats'
        });
    }
});

/**
 * GET /api/admin/recent-activities
 * Get recent activities for admin dashboard
 * Requires: ADMIN or MODERATOR role
 */
router.get('/recent-activities', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Get recent high scores
        const recentHighScores = await prisma.gameScore.findMany({
            where: {
                score: {
                    gte: 5000 // Only high scores
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 3,
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            }
        });

        // Get recent challenges
        const recentChallenges = await prisma.challenge.findMany({
            where: {
                status: 'COMPLETED'
            },
            orderBy: {
                completedAt: 'desc'
            },
            take: 3,
            include: {
                creator: {
                    select: {
                        username: true
                    }
                },
                opponent: {
                    select: {
                        username: true
                    }
                }
            }
        });

        // Get recent posts
        const recentPosts = await prisma.post.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 3,
            include: {
                user: {
                    select: {
                        username: true
                    }
                }
            }
        });

        // Get recent new users
        const recentUsers = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 3,
            select: {
                username: true,
                createdAt: true,
                email: true
            }
        });

        // Combine and format activities
        const activities = [];

        // Add high scores
        recentHighScores.forEach(score => {
            activities.push({
                type: 'high_score',
                message: `${score.user.username} đạt ${score.score} điểm trong ${score.gameType}`,
                timestamp: score.createdAt,
                icon: 'star',
                color: 'gold'
            });
        });

        // Add challenges
        recentChallenges.forEach(challenge => {
            if (challenge.opponent) {
                activities.push({
                    type: 'challenge',
                    message: `${challenge.creator.username} vs ${challenge.opponent.username} - Challenge hoàn thành`,
                    timestamp: challenge.completedAt,
                    icon: 'flash',
                    color: 'red'
                });
            }
        });

        // Add posts
        recentPosts.forEach(post => {
            activities.push({
                type: 'post',
                message: `${post.user.username} đăng bài mới`,
                timestamp: post.createdAt,
                icon: 'post',
                color: 'blue'
            });
        });

        // Add new users
        recentUsers.forEach(user => {
            activities.push({
                type: 'new_user',
                message: `${user.username} vừa tham gia`,
                timestamp: user.createdAt,
                icon: 'person_add',
                color: 'green'
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Take limit
        const limitedActivities = activities.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                activities: limitedActivities
            }
        });
    } catch (error) {
        console.error('Recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching recent activities'
        });
    }
});

/**
 * GET /api/admin/users
 * Get all users (for user management)
 * Requires: ADMIN or MODERATOR role
 */
router.get('/users', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), async (req, res) => {
    try {
        const { limit = 50, offset = 0, search } = req.query;

        const where = {};
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset),
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                totalGamesPlayed: true,
                totalScore: true,
                coins: true,
                createdAt: true,
                lastLoginAt: true,
                isTwoFactorEnabled: true
            }
        });

        const totalCount = await prisma.user.count({ where });

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
});

module.exports = router;
