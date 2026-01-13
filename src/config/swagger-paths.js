/**
 * Swagger API Paths - All 60+ Endpoints
 * Organized by feature groups
 */

module.exports = {
    // ==================== AUTHENTICATION ENDPOINTS ====================
    '/auth/register': {
        post: {
            tags: ['🔐 Authentication'],
            summary: 'Register new user',
            description: 'Create a new user account. First user becomes ADMIN automatically.',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/RegisterRequest' },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Registration successful',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/AuthResponse' },
                        },
                    },
                },
                '400': {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                        },
                    },
                },
            },
        },
    },

    '/auth/login': {
        post: {
            tags: ['🔐 Authentication'],
            summary: 'Login user',
            description: 'Authenticate user and receive JWT token',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/LoginRequest' },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Login successful',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/AuthResponse' },
                        },
                    },
                },
                '401': {
                    description: 'Invalid credentials',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                        },
                    },
                },
            },
        },
    },

    '/auth/me': {
        get: {
            tags: ['🔐 Authentication'],
            summary: 'Get current user profile',
            description: 'Retrieve authenticated user information',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'User profile retrieved',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                '401': {
                    description: 'Unauthorized',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                        },
                    },
                },
            },
        },
    },

    '/auth/forgot-password': {
        post: {
            tags: ['🔐 Authentication'],
            summary: 'Request password reset',
            description: 'Generate 6-digit reset token (sent via email in production)',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email'],
                            properties: {
                                email: { type: 'string', format: 'email' },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Reset token generated (if email exists)',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SuccessResponse' },
                        },
                    },
                },
            },
        },
    },

    '/auth/reset-password': {
        post: {
            tags: ['🔐 Authentication'],
            summary: 'Reset password with token',
            description: 'Reset password using the 6-digit token from forgot-password',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'resetToken', 'newPassword'],
                            properties: {
                                email: { type: 'string', format: 'email' },
                                resetToken: { type: 'string', example: '123456' },
                                newPassword: { type: 'string', minLength: 6 },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Password reset successful',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SuccessResponse' },
                        },
                    },
                },
                '400': {
                    description: 'Invalid or expired token',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                        },
                    },
                },
            },
        },
    },

    '/auth/profile': {
        put: {
            tags: ['🔐 Authentication'],
            summary: 'Update user profile',
            description: 'Update username or avatarUrl',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                username: { type: 'string', minLength: 3, maxLength: 20 },
                                avatarUrl: { type: 'string', nullable: true },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Profile updated',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SuccessResponse' },
                        },
                    },
                },
                '401': { description: 'Unauthorized' },
            },
        },
    },

    '/auth/change-password': {
        post: {
            tags: ['🔐 Authentication'],
            summary: 'Change password',
            description: 'Change password (requires current password)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['currentPassword', 'newPassword'],
                            properties: {
                                currentPassword: { type: 'string' },
                                newPassword: { type: 'string', minLength: 6 },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': { description: 'Password changed' },
                '401': { description: 'Current password incorrect' },
            },
        },
    },

    // ==================== USER MANAGEMENT ENDPOINTS ====================
    '/users/{userId}': {
        get: {
            tags: ['👤 Users'],
            summary: 'Get user by ID',
            description: 'Retrieve public user information',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'userId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': {
                    description: 'User found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/User' },
                                },
                            },
                        },
                    },
                },
                '404': { description: 'User not found' },
            },
        },
    },

    '/users/profile': {
        put: {
            tags: ['👤 Users'],
            summary: 'Update profile (username/email)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                username: { type: 'string', minLength: 3, maxLength: 20 },
                                email: { type: 'string', format: 'email' },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': { description: 'Profile updated' },
                '400': { description: 'Validation error' },
            },
        },
    },

    '/users/avatar': {
        put: {
            tags: ['👤 Users'],
            summary: 'Upload avatar',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['avatar'],
                            properties: {
                                avatar: {
                                    type: 'string',
                                    format: 'binary',
                                    description: 'Image file (JPEG/PNG, max 2MB)',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Avatar uploaded',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            avatarUrl: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ==================== CHALLENGE ENDPOINTS ====================
    '/challenges': {
        post: {
            tags: ['⚔️ Challenges'],
            summary: 'Create new challenge',
            description: 'Create 1v1 PK challenge with betting. Coins will be deducted from creator.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreateChallengeRequest' },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Challenge created',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: { $ref: '#/components/schemas/Challenge' },
                                },
                            },
                        },
                    },
                },
                '400': { description: 'Validation error or insufficient coins' },
            },
        },
    },

    '/challenges/pending': {
        get: {
            tags: ['⚔️ Challenges'],
            summary: 'Get pending challenges',
            description: 'Get all challenge invitations received by current user',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Pending challenges retrieved',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Challenge' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/challenges/{id}/accept': {
        post: {
            tags: ['⚔️ Challenges'],
            summary: 'Accept challenge',
            description: 'Accept challenge invitation. Coins will be deducted from opponent.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': {
                    description: 'Challenge accepted',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: { $ref: '#/components/schemas/Challenge' },
                                },
                            },
                        },
                    },
                },
                '400': { description: 'Invalid request or insufficient coins' },
            },
        },
    },

    '/challenges/{id}/reject': {
        post: {
            tags: ['⚔️ Challenges'],
            summary: 'Reject challenge',
            description: 'Reject challenge invitation. Coins will be refunded to creator.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': { description: 'Challenge rejected, coins refunded' },
            },
        },
    },

    '/challenges/{id}/vote': {
        post: {
            tags: ['⚔️ Challenges'],
            summary: 'Vote for game',
            description: 'Vote for which game to play in current round (1, 2, or 3)',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/VoteGameRequest' },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Vote recorded or game selected',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: { $ref: '#/components/schemas/Challenge' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/challenges/{id}/submit-score': {
        post: {
            tags: ['⚔️ Challenges'],
            summary: 'Submit game score',
            description: 'Submit score after completing a game. Winner determined automatically.',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/SubmitScoreRequest' },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Score submitted',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: { $ref: '#/components/schemas/Challenge' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/challenges/{id}': {
        get: {
            tags: ['⚔️ Challenges'],
            summary: 'Get challenge details',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': {
                    description: 'Challenge details',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: { $ref: '#/components/schemas/Challenge' },
                                },
                            },
                        },
                    },
                },
                '404': { description: 'Challenge not found' },
            },
        },
    },

    '/challenges/active': {
        get: {
            tags: ['⚔️ Challenges'],
            summary: 'Get active challenges',
            description: 'Get all active challenges for current user',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Active challenges',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Challenge' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/challenges/history': {
        get: {
            tags: ['⚔️ Challenges'],
            summary: 'Get challenge history',
            description: 'Get completed/cancelled/expired challenges',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'limit',
                    in: 'query',
                    schema: { type: 'integer', default: 20 },
                },
                {
                    name: 'offset',
                    in: 'query',
                    schema: { type: 'integer', default: 0 },
                },
            ],
            responses: {
                '200': {
                    description: 'Challenge history',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            challenges: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Challenge' },
                                            },
                                            pagination: {
                                                type: 'object',
                                                properties: {
                                                    total: { type: 'integer' },
                                                    limit: { type: 'integer' },
                                                    offset: { type: 'integer' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ==================== FRIENDS ENDPOINTS ====================
    '/friends/search': {
        get: {
            tags: ['👥 Friends'],
            summary: 'Search users',
            description: 'Search users by username or email',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'q',
                    in: 'query',
                    required: true,
                    schema: { type: 'string', minLength: 2 },
                    description: 'Search query',
                },
            ],
            responses: {
                '200': {
                    description: 'Search results',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    users: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/friends/request': {
        post: {
            tags: ['👥 Friends'],
            summary: 'Send friend request',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['receiverId'],
                            properties: {
                                receiverId: { type: 'string', format: 'uuid' },
                                message: { type: 'string', nullable: true },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': { description: 'Friend request sent' },
                '400': { description: 'Validation error' },
            },
        },
    },

    '/friends/requests': {
        get: {
            tags: ['👥 Friends'],
            summary: 'Get friend requests',
            description: 'Get all pending friend requests received',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Friend requests',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    requests: { type: 'array' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/friends/accept/{requestId}': {
        post: {
            tags: ['👥 Friends'],
            summary: 'Accept friend request',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'requestId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': { description: 'Friend request accepted' },
                '404': { description: 'Request not found' },
            },
        },
    },

    '/friends/reject/{requestId}': {
        post: {
            tags: ['👥 Friends'],
            summary: 'Reject friend request',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'requestId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': { description: 'Friend request rejected' },
            },
        },
    },

    '/friends': {
        get: {
            tags: ['👥 Friends'],
            summary: 'Get friends list',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Friends list',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    friends: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/friends/{friendId}': {
        delete: {
            tags: ['👥 Friends'],
            summary: 'Unfriend user',
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: 'friendId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            responses: {
                '200': { description: 'Friend removed' },
                '404': { description: 'Friendship not found' },
            },
        },
    },

    // ==================== POSTS ENDPOINTS ====================
    '/posts': {
        get: {
            tags: ['📝 Posts'],
            summary: 'Get posts feed',
            description: 'Get posts feed with filters',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
                { name: 'userId', in: 'query', schema: { type: 'string', format: 'uuid' } },
                { name: 'category', in: 'query', schema: { type: 'string' } },
                { name: 'search', in: 'query', schema: { type: 'string' } },
            ],
            responses: {
                '200': {
                    description: 'Posts feed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    posts: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Post' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            tags: ['📝 Posts'],
            summary: 'Create post',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreatePostRequest' },
                    },
                },
            },
            responses: {
                '201': { description: 'Post created' },
                '400': { description: 'Validation error' },
            },
        },
    },

    '/posts/{postId}': {
        get: {
            tags: ['📝 Posts'],
            summary: 'Get post details',
            description: 'Get post with comments',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': {
                    description: 'Post details',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Post' },
                        },
                    },
                },
                '404': { description: 'Post not found' },
            },
        },
        put: {
            tags: ['📝 Posts'],
            summary: 'Update post',
            description: 'Update post (owner only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/CreatePostRequest' },
                    },
                },
            },
            responses: {
                '200': { description: 'Post updated' },
                '403': { description: 'Not authorized' },
            },
        },
        delete: {
            tags: ['📝 Posts'],
            summary: 'Delete post',
            description: 'Delete post (owner only)',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': { description: 'Post deleted' },
                '403': { description: 'Not authorized' },
            },
        },
    },

    '/posts/{postId}/like': {
        post: {
            tags: ['📝 Posts'],
            summary: 'Toggle like on post',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': {
                    description: 'Like toggled',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    liked: { type: 'boolean' },
                                    message: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/posts/{postId}/comments': {
        post: {
            tags: ['📝 Posts'],
            summary: 'Add comment',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['content'],
                            properties: {
                                content: { type: 'string', minLength: 1 },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Comment added',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Comment' },
                        },
                    },
                },
            },
        },
    },

    '/posts/{postId}/save': {
        post: {
            tags: ['📝 Posts'],
            summary: 'Toggle save post',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': { description: 'Save toggled' },
            },
        },
    },

    '/posts/saved/list': {
        get: {
            tags: ['📝 Posts'],
            summary: 'Get saved posts',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Saved posts',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    posts: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Post' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/posts/follow/{targetUserId}': {
        post: {
            tags: ['📝 Posts'],
            summary: 'Toggle follow user',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'targetUserId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': { description: 'Follow toggled' },
            },
        },
    },

    '/posts/{postId}/share': {
        post: {
            tags: ['📝 Posts'],
            summary: 'Share post',
            description: 'Increment share count',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': { description: 'Post shared' },
            },
        },
    },

    // ==================== SCORES ENDPOINTS ====================
    '/scores': {
        get: {
            tags: ['🏆 Scores'],
            summary: 'Get user scores',
            description: 'Get score history with filters',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'gameType', in: 'query', schema: { type: 'string' } },
                { name: 'difficulty', in: 'query', schema: { type: 'string' } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            ],
            responses: {
                '200': {
                    description: 'Score history',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            scores: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/GameScore' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            tags: ['🏆 Scores'],
            summary: 'Save game score',
            description: 'Save score and auto-check achievements',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/SaveScoreRequest' },
                    },
                },
            },
            responses: {
                '201': { description: 'Score saved' },
                '400': { description: 'Validation error' },
            },
        },
    },

    '/scores/leaderboard': {
        get: {
            tags: ['🏆 Scores'],
            summary: 'Get leaderboard',
            description: 'Get global leaderboard with filters (public endpoint)',
            parameters: [
                {
                    name: 'gameType',
                    in: 'query',
                    schema: { type: 'string', default: 'all' },
                    description: 'all | GUESS_NUMBER | COWS_BULLS | etc.',
                },
                {
                    name: 'period',
                    in: 'query',
                    schema: { type: 'string', default: 'all-time' },
                    description: 'all-time | daily | weekly | monthly',
                },
                {
                    name: 'difficulty',
                    in: 'query',
                    schema: { type: 'string' },
                },
                {
                    name: 'limit',
                    in: 'query',
                    schema: { type: 'integer', default: 100 },
                },
            ],
            responses: {
                '200': {
                    description: 'Leaderboard',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            leaderboard: {
                                                type: 'array',
                                                items: {
                                                    allOf: [
                                                        { $ref: '#/components/schemas/GameScore' },
                                                        {
                                                            type: 'object',
                                                            properties: {
                                                                rank: { type: 'integer', example: 1 },
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                            personalRank: { type: 'integer', nullable: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/scores/stats': {
        get: {
            tags: ['🏆 Scores'],
            summary: 'Get user statistics',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'User stats',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            stats: { type: 'array' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ==================== ACHIEVEMENTS ENDPOINTS ====================
    '/achievements': {
        get: {
            tags: ['🏅 Achievements'],
            summary: 'Get all achievements',
            parameters: [
                { name: 'category', in: 'query', schema: { type: 'string' } },
            ],
            responses: {
                '200': {
                    description: 'All achievements',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            achievements: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Achievement' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/achievements/user/{userId}': {
        get: {
            tags: ['🏅 Achievements'],
            summary: 'Get user achievements',
            description: 'Get achievements with progress for specific user',
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': {
                    description: 'User achievements',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            achievements: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Achievement' },
                                            },
                                            stats: {
                                                type: 'object',
                                                properties: {
                                                    total: { type: 'integer' },
                                                    unlocked: { type: 'integer' },
                                                    totalPoints: { type: 'integer' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/achievements/check': {
        post: {
            tags: ['🏅 Achievements'],
            summary: 'Check achievements',
            description: 'Check and unlock achievements for current user',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Achievements checked',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            newlyUnlocked: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Achievement' },
                                            },
                                            totalChecked: { type: 'integer' },
                                            totalUpdated: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/achievements/stats': {
        get: {
            tags: ['🏅 Achievements'],
            summary: 'Get achievement stats',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': { description: 'Achievement statistics' },
            },
        },
    },

    // ==================== MESSAGES ENDPOINTS ====================
    '/messages': {
        post: {
            tags: ['💬 Messages'],
            summary: 'Send message',
            description: 'Send message to friend (P2P chat)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/SendMessageRequest' },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Message sent',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Message' },
                        },
                    },
                },
                '403': { description: 'Can only message friends' },
            },
        },
    },

    '/messages/{userId}': {
        get: {
            tags: ['💬 Messages'],
            summary: 'Get chat history',
            description: 'Get messages with specific user',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            ],
            responses: {
                '200': {
                    description: 'Chat history',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    messages: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Message' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/messages/{messageId}/read': {
        put: {
            tags: ['💬 Messages'],
            summary: 'Mark message as read',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': { description: 'Message marked as read' },
            },
        },
    },

    '/messages/unread/count': {
        get: {
            tags: ['💬 Messages'],
            summary: 'Get unread count',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Unread count',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    count: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/messages/conversations/list': {
        get: {
            tags: ['💬 Messages'],
            summary: 'Get conversations',
            description: 'Get list of conversations with last message',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Conversations list',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    conversations: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                friend: { $ref: '#/components/schemas/User' },
                                                lastMessage: { $ref: '#/components/schemas/Message' },
                                                unreadCount: { type: 'integer' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    // ==================== UPLOAD ENDPOINTS ====================
    '/upload': {
        post: {
            tags: ['📤 Upload'],
            summary: 'Upload image',
            description: 'Upload image file (max 5MB)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['image'],
                            properties: {
                                image: {
                                    type: 'string',
                                    format: 'binary',
                                    description: 'Image file (JPEG, PNG, GIF, WebP)',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Image uploaded',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    imageUrl: { type: 'string', example: '/uploads/image-123456.jpg' },
                                    filename: { type: 'string' },
                                    size: { type: 'integer' },
                                    mimetype: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                '400': { description: 'Invalid file type or size' },
            },
        },
    },

    '/upload/{filename}': {
        delete: {
            tags: ['📤 Upload'],
            summary: 'Delete uploaded image',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'filename', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
                '200': { description: 'File deleted' },
                '404': { description: 'File not found' },
            },
        },
    },

    // ==================== GAME LOGIC ENDPOINTS ====================
    '/games/guess-number/start': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Start Guess Number game',
            description: 'Create new Guess Number game session. Secret number stored server-side only.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                difficulty: {
                                    type: 'string',
                                    enum: ['easy', 'medium', 'hard', 'expert'],
                                    default: 'medium',
                                },
                            },
                        },
                        examples: {
                            medium: {
                                value: { difficulty: 'medium' },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Game session created',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean', example: true },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            sessionId: { type: 'string', format: 'uuid' },
                                            difficulty: { type: 'string', example: 'medium' },
                                            maxAttempts: { type: 'integer', example: 7 },
                                            range: {
                                                type: 'object',
                                                properties: {
                                                    min: { type: 'integer', example: 1 },
                                                    max: { type: 'integer', example: 100 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/guess-number/guess': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Submit guess',
            description: 'Make a guess. Server validates and provides hint (higher/lower)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId', 'guess'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                                guess: { type: 'integer', example: 50 },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Guess processed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            correct: { type: 'boolean' },
                                            hint: { type: 'string', enum: ['higher', 'lower'], nullable: true },
                                            attemptsUsed: { type: 'integer' },
                                            attemptsLeft: { type: 'integer' },
                                            gameOver: { type: 'boolean' },
                                            score: { type: 'integer', nullable: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/guess-number/session/{sessionId}': {
        get: {
            tags: ['🎮 Game Logic'],
            summary: 'Get Guess Number session',
            description: 'Resume game - get current session state',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': {
                    description: 'Session retrieved',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            sessionId: { type: 'string' },
                                            difficulty: { type: 'string' },
                                            attemptsUsed: { type: 'integer' },
                                            attemptsLeft: { type: 'integer' },
                                            range: { type: 'object' },
                                            previousGuesses: { type: 'array', items: { type: 'integer' } },
                                            hints: { type: 'array', items: { type: 'string' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/cows-bulls/start': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Start Cows & Bulls game',
            description: 'Generate 4-digit secret number (no repeating digits). Server-side only.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                difficulty: {
                                    type: 'string',
                                    enum: ['easy', 'medium', 'hard', 'expert'],
                                    default: 'medium',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Game created',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            sessionId: { type: 'string' },
                                            difficulty: { type: 'string' },
                                            maxAttempts: { type: 'integer', example: 8 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/cows-bulls/guess': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Submit Bulls & Cows guess',
            description: 'Guess 4-digit number. Returns Bulls (correct position) & Cows (wrong position)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId', 'guess'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                                guess: { type: 'string', pattern: '^[0-9]{4}$', example: '1234' },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Guess validated',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            guess: { type: 'string' },
                                            bulls: { type: 'integer', description: 'Correct digit, correct position' },
                                            cows: { type: 'integer', description: 'Correct digit, wrong position' },
                                            correct: { type: 'boolean' },
                                            attemptsUsed: { type: 'integer' },
                                            attemptsLeft: { type: 'integer' },
                                            gameOver: { type: 'boolean' },
                                            history: { type: 'array' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/cows-bulls/hint': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Get hint (reveal 1 digit)',
            description: 'Reveal one digit position. Score penalty: -500 points',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Hint revealed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            digit: { type: 'string', example: '3' },
                                            position: { type: 'integer', example: 2 },
                                            scoreReduction: { type: 'integer', example: 500 },
                                            hintsUsed: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/memory-match/start': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Start Memory Match game',
            description: 'Generate shuffled card pairs. Server tracks all moves.',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                difficulty: {
                                    type: 'string',
                                    enum: ['easy', 'medium', 'hard', 'expert'],
                                    default: 'medium',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Game created',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            sessionId: { type: 'string' },
                                            gridSize: { type: 'string', example: '4x6' },
                                            totalPairs: { type: 'integer', example: 12 },
                                            cards: {
                                                type: 'array',
                                                description: 'Shuffled card IDs',
                                                items: { type: 'integer' },
                                            },
                                            maxTime: { type: 'integer', example: 240 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/memory-match/flip': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Flip 2 cards',
            description: 'Flip two cards. Server tracks moves automatically (anti-cheat)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId', 'cardIndex1', 'cardIndex2'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                                cardIndex1: { type: 'integer', example: 0 },
                                cardIndex2: { type: 'integer', example: 5 },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Cards flipped',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            match: { type: 'boolean' },
                                            cardValue: { type: 'integer', nullable: true },
                                            pairsFound: { type: 'integer' },
                                            pairsRemaining: { type: 'integer' },
                                            moves: { type: 'integer', description: 'SERVER-TRACKED' },
                                            gameOver: { type: 'boolean' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/memory-match/complete': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Complete Memory Match game',
            description: 'Calculate final score. Time and moves are SERVER-CALCULATED (no trust in client)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Game completed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            score: { type: 'integer' },
                                            moves: { type: 'integer' },
                                            timeSpent: { type: 'integer' },
                                            stars: { type: 'integer', minimum: 1, maximum: 3 },
                                            breakdown: {
                                                type: 'object',
                                                properties: {
                                                    baseScore: { type: 'integer' },
                                                    timeBonus: { type: 'integer' },
                                                    moveBonus: { type: 'integer' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/quick-math/start': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Start Quick Math game',
            description: 'Generate random math questions. Sends only first question (prevents cheating)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                difficulty: {
                                    type: 'string',
                                    enum: ['easy', 'medium', 'hard', 'expert'],
                                    default: 'medium',
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                '201': {
                    description: 'Game created',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            sessionId: { type: 'string' },
                                            totalQuestions: { type: 'integer', example: 15 },
                                            timeLimit: { type: 'integer', example: 120 },
                                            currentQuestion: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'integer' },
                                                    question: { type: 'string', example: '5 + 3' },
                                                    questionStartedAt: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/quick-math/answer': {
        post: {
            tags: ['🎮 Game Logic'],
            summary: 'Submit answer',
            description: 'Submit answer to current question. Server calculates timing (anti-cheat)',
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['sessionId', 'questionId', 'answer'],
                            properties: {
                                sessionId: { type: 'string', format: 'uuid' },
                                questionId: { type: 'integer', example: 1 },
                                answer: { type: 'integer', example: 8 },
                            },
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Answer processed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            correct: { type: 'boolean' },
                                            correctAnswer: { type: 'integer' },
                                            questionScore: { type: 'integer' },
                                            totalScore: { type: 'integer' },
                                            questionsCompleted: { type: 'integer' },
                                            questionsRemaining: { type: 'integer' },
                                            nextQuestion: { type: 'object', nullable: true },
                                            gameOver: { type: 'boolean' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    '/games/quick-math/session/{sessionId}': {
        get: {
            tags: ['🎮 Game Logic'],
            summary: 'Get Quick Math session',
            description: 'Resume game - get current question',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            ],
            responses: {
                '200': {
                    description: 'Session retrieved',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            totalQuestions: { type: 'integer' },
                                            questionsCompleted: { type: 'integer' },
                                            questionsRemaining: { type: 'integer' },
                                            totalScore: { type: 'integer' },
                                            timeRemaining: { type: 'integer' },
                                            currentQuestion: { type: 'object', nullable: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
