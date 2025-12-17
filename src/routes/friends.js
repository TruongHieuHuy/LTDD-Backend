/**
 * Friend Management Routes
 * Zalo-style friend system: search users, send requests, accept/reject
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== SEARCH USERS ====================
/**
 * GET /api/friends/search?q=username
 * Search users by username (for adding friends)
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id; // From auth middleware

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Search users by username (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude current user
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        totalScore: true,
      },
      take: 20, // Limit results
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// ==================== SEND FRIEND REQUEST ====================
/**
 * POST /api/friends/request
 * Send friend request to another user
 */
router.post('/request', async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: senderId, userId2: receiverId },
          { userId1: receiverId, userId2: senderId },
        ],
      },
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'pending' },
          { senderId: receiverId, receiverId: senderId, status: 'pending' },
        ],
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    // Create friend request
    const request = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        message,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ==================== GET PENDING REQUESTS ====================
/**
 * GET /api/friends/requests
 * Get all pending friend requests (received)
 */
router.get('/requests', async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            totalScore: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// ==================== ACCEPT FRIEND REQUEST ====================
/**
 * POST /api/friends/accept/:requestId
 * Accept a friend request
 */
router.post('/accept/:requestId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Get request
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Cannot accept this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already responded to' });
    }

    // Update request status
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    });

    // Create friendship (userId1 < userId2)
    const [userId1, userId2] = [request.senderId, request.receiverId].sort();
    const friendship = await prisma.friendship.create({
      data: {
        userId1,
        userId2,
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(friendship);
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// ==================== REJECT FRIEND REQUEST ====================
/**
 * POST /api/friends/reject/:requestId
 * Reject a friend request
 */
router.post('/reject/:requestId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Cannot reject this request' });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        respondedAt: new Date(),
      },
    });

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// ==================== GET FRIENDS LIST ====================
/**
 * GET /api/friends
 * Get all friends of current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
        isBlocked: false,
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            totalScore: true,
            totalGamesPlayed: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            totalScore: true,
            totalGamesPlayed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to friend objects
    const friends = friendships.map((friendship) => {
      const friend = friendship.userId1 === userId ? friendship.user2 : friendship.user1;
      return {
        friendshipId: friendship.id,
        ...friend,
        friendsSince: friendship.createdAt,
      };
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// ==================== UNFRIEND ====================
/**
 * DELETE /api/friends/:friendId
 * Remove a friend
 */
router.delete('/:friendId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: userId, userId2: friendId },
          { userId1: friendId, userId2: userId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
