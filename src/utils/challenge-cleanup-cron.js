const { prisma } = require('./config/database');

/**
 * Cron job to clean up expired challenges
 * Refunds creator coins for PENDING challenges that have expired
 */
async function cleanupExpiredChallenges() {
    try {
        // Find all expired PENDING challenges
        const expiredChallenges = await prisma.challenge.findMany({
            where: {
                status: 'PENDING',
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        console.log(`[CRON] Found ${expiredChallenges.length} expired challenges to clean up`);

        // Process each expired challenge
        for (const challenge of expiredChallenges) {
            await prisma.$transaction(async (tx) => {
                // Refund creator
                await tx.user.update({
                    where: { id: challenge.creatorId },
                    data: { coins: { increment: challenge.betAmount } }
                });

                // Update challenge status
                await tx.challenge.update({
                    where: { id: challenge.id },
                    data: {
                        status: 'EXPIRED',
                        cancelledAt: new Date()
                    }
                });

                console.log(`[CRON] Expired challenge ${challenge.id}, refunded ${challenge.betAmount} coins to creator ${challenge.creatorId}`);
            });
        }

        console.log(`[CRON] Cleanup completed. Processed ${expiredChallenges.length} challenges`);
    } catch (error) {
        console.error('[CRON] Error cleaning up expired challenges:', error);
    }
}

/**
 * Start the cron job
 * Runs every hour to clean up expired challenges
 */
function startChallengeCleanupCron() {
    // Run immediately on startup
    cleanupExpiredChallenges();

    // Then run every hour
    const ONE_HOUR = 60 * 60 * 1000;
    setInterval(cleanupExpiredChallenges, ONE_HOUR);

    console.log('[CRON] Challenge cleanup cron job started (runs every hour)');
}

module.exports = { cleanupExpiredChallenges, startChallengeCleanupCron };
