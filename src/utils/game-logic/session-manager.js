/**
 * Session Manager for Game Sessions
 * Handles session creation, validation, and lifecycle
 */

const { prisma } = require('../../config/database');

/**
 * Create a new game session
 * @param {string} userId - User ID
 * @param {string} gameType - Game type enum
 * @param {string} difficulty - Difficulty level
 * @param {object} sessionData - Initial session data
 * @param {number} expiryHours - Hours until expiry (default 1)
 * @returns {Promise<object>} created session
 */
async function createSession(userId, gameType, difficulty, sessionData, expiryHours = 1) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const session = await prisma.gameSession.create({
        data: {
            userId,
            gameType,
            difficulty,
            sessionData,
            expiresAt,
            status: 'ACTIVE',
        },
    });

    return session;
}

/**
 * Get session by ID and validate ownership
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID to verify ownership
 * @returns {Promise<object>} session if valid
 * @throws {Error} if not found, not owned, or expired
 */
async function getSession(sessionId, userId) {
    const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
    });

    if (!session) {
        throw new Error('SESSION_NOT_FOUND');
    }

    if (session.userId !== userId) {
        throw new Error('UNAUTHORIZED');
    }

    if (session.status === 'COMPLETED') {
        throw new Error('SESSION_COMPLETED');
    }

    if (session.status === 'EXPIRED' || new Date() > new Date(session.expiresAt)) {
        // Mark as expired if not already
        if (session.status !== 'EXPIRED') {
            await prisma.gameSession.update({
                where: { id: sessionId },
                data: { status: 'EXPIRED' },
            });
        }
        throw new Error('SESSION_EXPIRED');
    }

    if (session.status !== 'ACTIVE') {
        throw new Error('SESSION_NOT_ACTIVE');
    }

    return session;
}

/**
 * Update session data
 * @param {string} sessionId - Session ID
 * @param {object} sessionData - Updated session data
 * @param {object} additionalUpdates - Additional fields to update (optional)
 * @returns {Promise<object>} updated session
 */
async function updateSession(sessionId, sessionData, additionalUpdates = {}) {
    return await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
            sessionData,
            ...additionalUpdates,
        },
    });
}

/**
 * Complete a session with final score
 * @param {string} sessionId - Session ID
 * @param {number} score - Final score
 * @param {object} additionalData - Additional data (moves, timeSpent, etc.)
 * @returns {Promise<object>} completed session
 */
async function completeSession(sessionId, score, additionalData = {}) {
    return await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            score,
            ...additionalData,
        },
    });
}

/**
 * Add suspicious activity flag to session
 * @param {string} sessionId - Session ID
 * @param {string} flag - Flag description
 * @returns {Promise<object>} updated session
 */
async function flagSuspiciousActivity(sessionId, flag) {
    const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
    });

    const existingFlags = session.suspiciousActivity || [];
    const newFlags = Array.isArray(existingFlags) ? existingFlags : [];

    newFlags.push({
        flag,
        timestamp: new Date().toISOString(),
    });

    return await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
            suspiciousActivity: newFlags,
        },
    });
}

/**
 * Calculate time spent since session start
 * @param {object} session - Session object
 * @returns {number} time spent in seconds
 */
function calculateTimeSpent(session) {
    const startTime = new Date(session.startedAt);
    const now = new Date();
    return Math.floor((now - startTime) / 1000);
}

/**
 * Cleanup expired sessions (for background job)
 * @returns {Promise<number>} number of deleted sessions
 */
async function cleanupExpiredSessions() {
    const result = await prisma.gameSession.updateMany({
        where: {
            status: 'ACTIVE',
            expiresAt: {
                lt: new Date(),
            },
        },
        data: {
            status: 'EXPIRED',
        },
    });

    return result.count;
}

module.exports = {
    createSession,
    getSession,
    updateSession,
    completeSession,
    flagSuspiciousActivity,
    calculateTimeSpent,
    cleanupExpiredSessions,
};
