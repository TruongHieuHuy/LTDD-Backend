const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger OpenAPI 3.0 Configuration
 * Interactive API Documentation for Mini Game Center
 */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '🎮 Mini Game Center API',
            version: '1.0.0',
            description: `
        Backend API cho ứng dụng Mobile Game Center với các tính năng:
        - 🔐 Authentication & User Management
        - ⚔️ PK Challenge System (1v1 battles with betting)
        - 👥 Friends & Social Network
        - 📝 Posts, Likes, Comments
        - 🏆 Scores & Leaderboard
        - 🏅 Achievements & Badges
        - 💬 Real-time Chat
        - 📤 File Upload
      `,
            contact: {
                name: 'API Support',
                email: 'support@minigamecenter.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Development Server',
            },
            {
                url: 'http://localhost:3000/api',
                description: 'Production Server (update URL)',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using Bearer scheme. Example: "Bearer {token}"',
                },
            },
            schemas: {
                // ==================== Common Schemas ====================
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: { type: 'object' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'string' } },
                    },
                },

                // ==================== User Schema ====================
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string', example: 'player123' },
                        email: { type: 'string', format: 'email', example: 'player@example.com' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
                        avatarUrl: { type: 'string', nullable: true },
                        totalScore: { type: 'integer', example: 15000 },
                        totalGamesPlayed: { type: 'integer', example: 50 },
                        coins: { type: 'integer', example: 1000 },
                        createdAt: { type: 'string', format: 'date-time' },
                        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                },

                // ==================== Auth Schemas ====================
                RegisterRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: {
                            type: 'string',
                            minLength: 3,
                            maxLength: 20,
                            example: 'player123'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'player@example.com'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            description: 'Must contain uppercase, lowercase, number, and special char',
                            example: 'Password@123'
                        },
                    },
                },

                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'player@example.com' },
                        password: { type: 'string', example: 'Password@123' },
                    },
                },

                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                token: { type: 'string', description: 'JWT token' },
                            },
                        },
                    },
                },

                // ==================== Challenge Schema ====================
                Challenge: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        creatorId: { type: 'string', format: 'uuid' },
                        opponentId: { type: 'string', format: 'uuid' },
                        betAmount: { type: 'integer', example: 100 },
                        status: {
                            type: 'string',
                            enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
                            example: 'ACTIVE'
                        },
                        currentGame: { type: 'integer', minimum: 1, maximum: 3, example: 1 },
                        gamesCompleted: { type: 'integer', example: 0 },
                        creatorWins: { type: 'integer', example: 0 },
                        opponentWins: { type: 'integer', example: 0 },
                        winnerId: { type: 'string', format: 'uuid', nullable: true },
                        isDraw: { type: 'boolean', example: false },
                        expiresAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        creator: { $ref: '#/components/schemas/User' },
                        opponent: { $ref: '#/components/schemas/User' },
                    },
                },

                CreateChallengeRequest: {
                    type: 'object',
                    required: ['opponentId'],
                    properties: {
                        opponentId: { type: 'string', format: 'uuid' },
                        betAmount: { type: 'integer', minimum: 10, maximum: 10000, default: 100 },
                    },
                },

                VoteGameRequest: {
                    type: 'object',
                    required: ['gameNumber', 'gameType'],
                    properties: {
                        gameNumber: { type: 'integer', enum: [1, 2, 3] },
                        gameType: {
                            type: 'string',
                            enum: ['GUESS_NUMBER', 'COWS_BULLS', 'MEMORY_MATCH', 'QUICK_MATH']
                        },
                    },
                },

                SubmitScoreRequest: {
                    type: 'object',
                    required: ['gameNumber', 'score'],
                    properties: {
                        gameNumber: { type: 'integer', enum: [1, 2, 3] },
                        score: { type: 'integer', minimum: 0 },
                    },
                },

                // ==================== Post Schema ====================
                Post: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        imageUrl: { type: 'string', nullable: true },
                        visibility: { type: 'string', enum: ['public', 'friends'], default: 'public' },
                        category: {
                            type: 'string',
                            enum: ['guess_number', 'cows_bulls', 'memory_match', 'quick_math', 'rubik', 'sudoku', 'puzzle', 'caro'],
                            nullable: true
                        },
                        likeCount: { type: 'integer', example: 10 },
                        commentCount: { type: 'integer', example: 5 },
                        shareCount: { type: 'integer', example: 2 },
                        createdAt: { type: 'string', format: 'date-time' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },

                CreatePostRequest: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                        content: { type: 'string', minLength: 1 },
                        imageUrl: { type: 'string', nullable: true },
                        visibility: { type: 'string', enum: ['public', 'friends'], default: 'public' },
                        category: {
                            type: 'string',
                            enum: ['guess_number', 'cows_bulls', 'memory_match', 'quick_math', 'rubik', 'sudoku', 'puzzle', 'caro'],
                            nullable: true
                        },
                    },
                },

                Comment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        postId: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },

                // ==================== GameScore Schema ====================
                GameScore: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        gameType: {
                            type: 'string',
                            enum: ['guess_number', 'cows_bulls', 'memory_match', 'quick_math', 'rubik', 'sudoku', 'caro', 'puzzle']
                        },
                        score: { type: 'integer' },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
                        attempts: { type: 'integer' },
                        timeSpent: { type: 'integer', description: 'Time in seconds' },
                        createdAt: { type: 'string', format: 'date-time' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },

                SaveScoreRequest: {
                    type: 'object',
                    required: ['gameType', 'score', 'difficulty'],
                    properties: {
                        gameType: {
                            type: 'string',
                            enum: ['guess_number', 'cows_bulls', 'memory_match', 'quick_math', 'rubik', 'sudoku', 'caro', 'puzzle']
                        },
                        score: { type: 'integer', minimum: 0, maximum: 1000000 },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
                        attempts: { type: 'integer' },
                        timeSpent: { type: 'integer' },
                        gameData: { type: 'object', nullable: true },
                    },
                },

                // ==================== Achievement Schema ====================
                Achievement: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'First Win' },
                        description: { type: 'string', example: 'Win your first game' },
                        icon: { type: 'string', example: '🏆' },
                        category: { type: 'string', example: 'game' },
                        points: { type: 'integer', example: 10 },
                        requirement: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', example: 'total_games' },
                                value: { type: 'integer', example: 1 },
                            },
                        },
                        progress: { type: 'integer', minimum: 0, maximum: 100, example: 50 },
                        isUnlocked: { type: 'boolean', example: false },
                        unlockedAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                },

                // ==================== Message Schema ====================
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        senderId: { type: 'string', format: 'uuid' },
                        receiverId: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        type: { type: 'string', enum: ['text', 'image'], default: 'text' },
                        isRead: { type: 'boolean', default: false },
                        sentAt: { type: 'string', format: 'date-time' },
                        readAt: { type: 'string', format: 'date-time', nullable: true },
                        sender: { $ref: '#/components/schemas/User' },
                    },
                },

                SendMessageRequest: {
                    type: 'object',
                    required: ['receiverId', 'content'],
                    properties: {
                        receiverId: { type: 'string', format: 'uuid' },
                        content: { type: 'string', minLength: 1 },
                        type: { type: 'string', enum: ['text', 'image'], default: 'text' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            { name: '🔐 Authentication', description: 'User authentication and profile management' },
            { name: '👤 Users', description: 'User profile and avatar management' },
            { name: '⚔️ Challenges', description: 'PK Challenge system (1v1 battles)' },
            { name: '👥 Friends', description: 'Friend requests and friendships' },
            { name: '📝 Posts', description: 'Social posts with likes and comments' },
            { name: '🏆 Scores', description: 'Game scores and leaderboard' },
            { name: '🏅 Achievements', description: 'Achievements and badges' },
            { name: '💬 Messages', description: 'P2P messaging system' },
            { name: '📤 Upload', description: 'File upload management' },
        ],
    },
    apis: [], // We'll define paths directly in the definition
};

// Add all API paths
try {
    options.definition.paths = require('./swagger-paths');
} catch (error) {
    // If swagger-paths doesn't exist, continue without it
    options.definition.paths = {};
}

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
    swaggerUi,
    swaggerSpec,
};
