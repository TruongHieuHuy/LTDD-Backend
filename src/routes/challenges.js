const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/error-handler');

// ==================== HELPERS ====================
const VALID_GAMES = ['GUESS_NUMBER', 'COWS_BULLS', 'MEMORY_MATCH', 'QUICK_MATH'];

const getMaxScore = (gameType) => {
    const maxScores = {
        'GUESS_NUMBER': 10000,
        'COWS_BULLS': 15000,
        'MEMORY_MATCH': 20000,
        'QUICK_MATH': 25000
    };
    return maxScores[gameType] || 10000;
};

// ==================== CREATE CHALLENGE (with Betting) ====================
/**
 * POST /api/challenges
 * Create a new challenge and deduct bet amount from creator
 */
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const { opponentId, betAmount = 100 } = req.body;
        const creatorId = req.user.id;

        // Validation
        if (!opponentId) {
            throw new ValidationError('Opponent ID is required');
        }

        if (opponentId === creatorId) {
            throw new ValidationError('Cannot challenge yourself');
        }

        if (betAmount < 10 || betAmount > 10000) {
            throw new ValidationError('Bet amount must be between 10 and 10000 coins');
        }

        // Use Prisma transaction to ensure atomicity
        const challenge = await prisma.$transaction(async (tx) => {
            // 1. Check if opponent exists
            const opponent = await tx.user.findUnique({
                where: { id: opponentId },
                select: { id: true, username: true, coins: true }
            });

            if (!opponent) {
                throw new NotFoundError('Opponent user');
            }

            // 2. Check if users are friends
            const [userId1, userId2] = [creatorId, opponentId].sort();
            const friendship = await tx.friendship.findUnique({
                where: {
                    userId1_userId2: { userId1, userId2 }
                }
            });

            if (!friendship) {
                throw new ValidationError('You must be friends to send a challenge');
            }

            // 3. Check creator has enough coins
            const creator = await tx.user.findUnique({
                where: { id: creatorId },
                select: { coins: true, username: true }
            });

            if (creator.coins < betAmount) {
                throw new ValidationError(`Insufficient coins. You have ${creator.coins}, need ${betAmount}`);
            }

            // 4. Check for existing active challenges
            const existingChallenge = await tx.challenge.findFirst({
                where: {
                    OR: [
                        { creatorId, opponentId, status: { in: ['PENDING', 'ACTIVE'] } },
                        { creatorId: opponentId, opponentId: creatorId, status: { in: ['PENDING', 'ACTIVE'] } }
                    ]
                }
            });

            if (existingChallenge) {
                throw new ConflictError('An active challenge already exists between you');
            }

            // 5. Deduct coins from creator
            await tx.user.update({
                where: { id: creatorId },
                data: { coins: { decrement: betAmount } }
            });

            // 6. Create challenge with expiry (24 hours)
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const newChallenge = await tx.challenge.create({
                data: {
                    creatorId,
                    opponentId,
                    betAmount,
                    expiresAt,
                    status: 'PENDING'
                },
                include: {
                    creator: {
                        select: { id: true, username: true, avatarUrl: true, coins: true }
                    },
                    opponent: {
                        select: { id: true, username: true, avatarUrl: true, coins: true }
                    }
                }
            });

            return newChallenge;
        });

        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(opponentId).emit('challenge_received', {
                challenge,
                message: `${req.user.username} challenged you to a PK match for ${betAmount} coins!`
            });
        }

        res.status(201).json({
            success: true,
            message: 'Challenge created successfully. Coins deducted.',
            data: challenge
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET PENDING CHALLENGES ====================
/**
 * GET /api/challenges/pending
 * Get all pending challenge invitations for current user
 */
router.get('/pending', authenticateToken, async (req, res, next) => {
    try {
        const challenges = await prisma.challenge.findMany({
            where: {
                OR: [
                    { opponentId: req.user.id }, // Challenges received
                    { creatorId: req.user.id }   // Challenges sent
                ],
                status: 'PENDING',
                expiresAt: { gt: new Date() } // Not expired
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        totalScore: true,
                        totalGamesPlayed: true
                    }
                },
                opponent: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        totalScore: true,
                        totalGamesPlayed: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
});

// ==================== ACCEPT CHALLENGE (with Betting) ====================
/**
 * POST /api/challenges/:id/accept
 * Accept a challenge and deduct bet amount from opponent
 */
router.post('/:id/accept', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Use transaction for atomic bet deduction
        const updatedChallenge = await prisma.$transaction(async (tx) => {
            // 1. Get challenge
            const challenge = await tx.challenge.findUnique({
                where: { id },
                include: {
                    creator: { select: { id: true, username: true } },
                    opponent: { select: { id: true, username: true, coins: true } }
                }
            });

            if (!challenge) {
                throw new NotFoundError('Challenge');
            }

            // 2. Verify user is the opponent
            if (challenge.opponentId !== req.user.id) {
                throw new ValidationError('You are not the opponent of this challenge');
            }

            // 3. Check status
            if (challenge.status !== 'PENDING') {
                throw new ValidationError('Challenge is no longer pending');
            }

            // 4. Check if expired
            if (new Date() > challenge.expiresAt) {
                // Auto-expire and refund creator
                await tx.challenge.update({
                    where: { id },
                    data: { status: 'EXPIRED' }
                });

                await tx.user.update({
                    where: { id: challenge.creatorId },
                    data: { coins: { increment: challenge.betAmount } }
                });

                throw new ValidationError('Challenge has expired');
            }

            // 5. Check opponent has enough coins
            if (challenge.opponent.coins < challenge.betAmount) {
                throw new ValidationError(
                    `Insufficient coins. You have ${challenge.opponent.coins}, need ${challenge.betAmount}`
                );
            }

            // 6. Deduct coins from opponent
            await tx.user.update({
                where: { id: req.user.id },
                data: { coins: { decrement: challenge.betAmount } }
            });

            // 7. Update challenge status
            const updated = await tx.challenge.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    acceptedAt: new Date()
                },
                include: {
                    creator: {
                        select: { id: true, username: true, avatarUrl: true, coins: true }
                    },
                    opponent: {
                        select: { id: true, username: true, avatarUrl: true, coins: true }
                    }
                }
            });

            return updated;
        });

        // Notify creator
        const io = req.app.get('io');
        if (io) {
            io.to(updatedChallenge.creatorId).emit('challenge_accepted', {
                challenge: updatedChallenge,
                message: `${req.user.username} accepted your challenge! Time to vote for Game 1`
            });
        }

        res.json({
            success: true,
            message: 'Challenge accepted! Coins deducted. Prepare to vote for Game 1',
            data: updatedChallenge
        });
    } catch (error) {
        next(error);
    }
});

// ==================== REJECT CHALLENGE ====================
/**
 * POST /api/challenges/:id/reject
 * Reject a challenge - refunds creator
 */
router.post('/:id/reject', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await prisma.$transaction(async (tx) => {
            const challenge = await tx.challenge.findUnique({
                where: { id }
            });

            if (!challenge) {
                throw new NotFoundError('Challenge');
            }

            if (challenge.opponentId !== req.user.id) {
                throw new ValidationError('You are not the opponent of this challenge');
            }

            if (challenge.status !== 'PENDING') {
                throw new ValidationError('Challenge is no longer pending');
            }

            // Refund creator
            await tx.user.update({
                where: { id: challenge.creatorId },
                data: { coins: { increment: challenge.betAmount } }
            });

            // Update challenge
            const updated = await tx.challenge.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date()
                }
            });

            return updated;
        });

        // Notify creator
        const io = req.app.get('io');
        if (io) {
            io.to(result.creatorId).emit('challenge_rejected', {
                challengeId: id,
                message: `${req.user.username} declined your challenge. Coins refunded.`
            });
        }

        res.json({
            success: true,
            message: 'Challenge rejected. Creator coins refunded.',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// ==================== VOTE FOR GAME ====================
/**
 * POST /api/challenges/:id/vote
 * Vote for which game to play in current round
 */
router.post('/:id/vote', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { gameNumber, gameType } = req.body;

        if (!gameNumber || ![1, 2, 3].includes(gameNumber)) {
            throw new ValidationError('Game number must be 1, 2, or 3');
        }

        if (!VALID_GAMES.includes(gameType)) {
            throw new ValidationError('Invalid game type. Must be: ' + VALID_GAMES.join(', '));
        }

        const challenge = await prisma.challenge.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, username: true } },
                opponent: { select: { id: true, username: true } }
            }
        });

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        // Verify user is part of challenge
        if (challenge.creatorId !== req.user.id && challenge.opponentId !== req.user.id) {
            throw new ValidationError('You are not part of this challenge');
        }

        // Check if status is ACTIVE
        if (challenge.status !== 'ACTIVE') {
            throw new ValidationError('Challenge is not active');
        }

        // Check if this game is already completed
        if (challenge[`game${gameNumber}Completed`]) {
            throw new ValidationError(`Game ${gameNumber} is already completed`);
        }

        const isCreator = challenge.creatorId === req.user.id;
        const voteField = `game${gameNumber}${isCreator ? 'Creator' : 'Opponent'}Vote`;

        // Update vote
        const updateData = { [voteField]: gameType };
        const updated = await prisma.challenge.update({
            where: { id },
            data: updateData
        });

        // Check if both voted
        const creatorVote = updated[`game${gameNumber}CreatorVote`];
        const opponentVote = updated[`game${gameNumber}OpponentVote`];

        if (creatorVote && opponentVote) {
            // Both voted - determine game
            let selectedGame;
            if (creatorVote === opponentVote) {
                selectedGame = creatorVote;
            } else {
                // Random selection
                selectedGame = Math.random() < 0.5 ? creatorVote : opponentVote;
            }

            // Update selected game type
            const final = await prisma.challenge.update({
                where: { id },
                data: {
                    [`game${gameNumber}Type`]: selectedGame
                },
                include: {
                    creator: { select: { id: true, username: true, avatarUrl: true } },
                    opponent: { select: { id: true, username: true, avatarUrl: true } }
                }
            });

            // Notify both players
            const io = req.app.get('io');
            if (io) {
                const message = creatorVote === opponentVote
                    ? `Both chose ${selectedGame}!`
                    : `Randomly selected: ${selectedGame}`;

                io.to(challenge.creatorId).to(challenge.opponentId).emit('game_selected', {
                    challenge: final,
                    selectedGame,
                    gameNumber,
                    message
                });
            }

            return res.json({
                success: true,
                message: `Game ${gameNumber} selected: ${selectedGame}. Start playing!`,
                data: final
            });
        }

        res.json({
            success: true,
            message: 'Vote recorded. Waiting for opponent...',
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

// ==================== SUBMIT SCORE ====================
/**
 * POST /api/challenges/:id/submit-score
 * Submit score after completing a game (with validation)
 */
router.post('/:id/submit-score', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { gameNumber, score } = req.body;

        if (!gameNumber || ![1, 2, 3].includes(gameNumber)) {
            throw new ValidationError('Game number must be 1, 2, or 3');
        }

        if (score === undefined || score < 0) {
            throw new ValidationError('Invalid score');
        }

        const result = await prisma.$transaction(async (tx) => {
            const challenge = await tx.challenge.findUnique({
                where: { id }
            });

            if (!challenge) {
                throw new NotFoundError('Challenge');
            }

            // Verify user is part of challenge
            if (challenge.creatorId !== req.user.id && challenge.opponentId !== req.user.id) {
                throw new ValidationError('You are not part of this challenge');
            }

            // Check if game type selected
            const gameType = challenge[`game${gameNumber}Type`];
            if (!gameType) {
                throw new ValidationError(`Game ${gameNumber} type not selected yet. Vote first.`);
            }

            // Validate score (basic check)
            const maxScore = getMaxScore(gameType);
            if (score > maxScore) {
                throw new ValidationError(`Score ${score} exceeds maximum ${maxScore} for ${gameType}`);
            }

            // Check if already completed
            if (challenge[`game${gameNumber}Completed`]) {
                throw new ValidationError(`Game ${gameNumber} already completed`);
            }

            const isCreator = challenge.creatorId === req.user.id;
            const scoreField = `game${gameNumber}${isCreator ? 'Creator' : 'Opponent'}Score`;

            // Update score
            const updateData = { [scoreField]: parseInt(score) };
            const updated = await tx.challenge.update({
                where: { id },
                data: updateData
            });

            // Check if both submitted
            const creatorScore = updated[`game${gameNumber}CreatorScore`];
            const opponentScore = updated[`game${gameNumber}OpponentScore`];

            if (creatorScore > 0 && opponentScore > 0) {
                // Both submitted - determine winner
                let gameWinner = null;
                if (creatorScore > opponentScore) {
                    gameWinner = 'creator';
                } else if (opponentScore > creatorScore) {
                    gameWinner = 'opponent';
                } // else tie

                // Update wins and completed flag
                const winUpdate = {};
                winUpdate[`game${gameNumber}Completed`] = true;

                if (gameWinner === 'creator') {
                    winUpdate.creatorWins = { increment: 1 };
                } else if (gameWinner === 'opponent') {
                    winUpdate.opponentWins = { increment: 1 };
                }

                const withWins = await tx.challenge.update({
                    where: { id },
                    data: winUpdate
                });

                // Check if challenge is over
                const creatorWins = withWins.creatorWins;
                const opponentWins = withWins.opponentWins;
                const gamesCompleted = withWins.gamesCompleted + 1;

                let finalUpdate = {
                    gamesCompleted
                };

                // Check win condition (2 wins or all 3 games played)
                if (creatorWins >= 2) {
                    finalUpdate.status = 'COMPLETED';
                    finalUpdate.winnerId = challenge.creatorId;
                    finalUpdate.completedAt = new Date();

                    // Pay winner (creator gets 2x bet)
                    await tx.user.update({
                        where: { id: challenge.creatorId },
                        data: { coins: { increment: challenge.betAmount * 2 } }
                    });
                } else if (opponentWins >= 2) {
                    finalUpdate.status = 'COMPLETED';
                    finalUpdate.winnerId = challenge.opponentId;
                    finalUpdate.completedAt = new Date();

                    // Pay winner (opponent gets 2x bet)
                    await tx.user.update({
                        where: { id: challenge.opponentId },
                        data: { coins: { increment: challenge.betAmount * 2 } }
                    });
                } else if (gamesCompleted === 3) {
                    // All 3 games played
                    finalUpdate.status = 'COMPLETED';
                    finalUpdate.completedAt = new Date();

                    if (creatorWins > opponentWins) {
                        finalUpdate.winnerId = challenge.creatorId;
                        await tx.user.update({
                            where: { id: challenge.creatorId },
                            data: { coins: { increment: challenge.betAmount * 2 } }
                        });
                    } else if (opponentWins > creatorWins) {
                        finalUpdate.winnerId = challenge.opponentId;
                        await tx.user.update({
                            where: { id: challenge.opponentId },
                            data: { coins: { increment: challenge.betAmount * 2 } }
                        });
                    } else {
                        // Draw - refund both (50/50)
                        finalUpdate.isDraw = true;
                        await tx.user.update({
                            where: { id: challenge.creatorId },
                            data: { coins: { increment: challenge.betAmount } }
                        });
                        await tx.user.update({
                            where: { id: challenge.opponentId },
                            data: { coins: { increment: challenge.betAmount } }
                        });
                    }
                } else {
                    // Move to next game
                    finalUpdate.currentGame = gameNumber + 1;
                }

                const finalChallenge = await tx.challenge.update({
                    where: { id },
                    data: finalUpdate,
                    include: {
                        creator: { select: { id: true, username: true, avatarUrl: true, coins: true } },
                        opponent: { select: { id: true, username: true, avatarUrl: true, coins: true } },
                        winner: { select: { id: true, username: true, avatarUrl: true } }
                    }
                });

                return finalChallenge;
            }

            return updated;
        });

        // Notify players
        const io = req.app.get('io');
        if (io) {
            const eventType = result.status === 'COMPLETED' ? 'challenge_completed' : 'game_completed';
            io.to(result.creatorId).to(result.opponentId).emit(eventType, {
                challenge: result,
                gameNumber
            });
        }

        const message = result.status === 'COMPLETED'
            ? (result.isDraw ? 'Challenge ended in a draw! Coins refunded.' : 'Challenge completed! Winner determined.')
            : `Game ${gameNumber} completed! ${result.currentGame <= 3 ? 'Vote for next game' : 'Challenge done'}`;

        res.json({
            success: true,
            message,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET CHALLENGE DETAILS ====================
/**
 * GET /api/challenges/:id
 * Get detailed challenge information
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const challenge = await prisma.challenge.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        totalScore: true,
                        totalGamesPlayed: true,
                        coins: true
                    }
                },
                opponent: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        totalScore: true,
                        totalGamesPlayed: true,
                        coins: true
                    }
                },
                winner: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        // Verify user is part of challenge
        if (challenge.creatorId !== req.user.id && challenge.opponentId !== req.user.id) {
            throw new ValidationError('You are not authorized to view this challenge');
        }

        res.json({
            success: true,
            data: challenge
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET ACTIVE CHALLENGES ====================
/**
 * GET /api/challenges/active
 * Get all active challenges for current user
 */
router.get('/active', authenticateToken, async (req, res, next) => {
    try {
        const challenges = await prisma.challenge.findMany({
            where: {
                OR: [
                    { creatorId: req.user.id },
                    { opponentId: req.user.id }
                ],
                status: 'ACTIVE'
            },
            include: {
                creator: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } }
            },
            orderBy: { acceptedAt: 'desc' }
        });

        res.json({
            success: true,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET CHALLENGE HISTORY ====================
/**
 * GET /api/challenges/history
 * Get completed/cancelled challenges
 */
router.get('/history', authenticateToken, async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const challenges = await prisma.challenge.findMany({
            where: {
                OR: [
                    { creatorId: req.user.id },
                    { opponentId: req.user.id }
                ],
                status: {
                    in: ['COMPLETED', 'CANCELLED', 'EXPIRED']
                }
            },
            include: {
                creator: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } },
                winner: { select: { id: true, username: true, avatarUrl: true } }
            },
            orderBy: { completedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const total = await prisma.challenge.count({
            where: {
                OR: [
                    { creatorId: req.user.id },
                    { opponentId: req.user.id }
                ],
                status: {
                    in: ['COMPLETED', 'CANCELLED', 'EXPIRED']
                }
            }
        });

        res.json({
            success: true,
            data: {
                challenges,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
