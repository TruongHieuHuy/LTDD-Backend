/**
 * Messages Routes
 * P2P chat messaging system
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== SEND MESSAGE ====================
/**
 * POST /api/messages
 * Send a message to another user
 */
router.post('/', async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content, type = 'text' } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    // Check if they are friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: senderId, userId2: receiverId },
          { userId1: receiverId, userId2: senderId },
        ],
        isBlocked: false,
      },
    });

    if (!friendship) {
      return res.status(403).json({ error: 'Can only message friends' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        type,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ==================== GET CHAT HISTORY ====================
/**
 * GET /api/messages/:userId
 * Get chat history with a specific user
 */
router.get('/:userId', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ messages: messages.reverse() }); // Oldest first
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// ==================== MARK AS READ ====================
/**
 * PUT /api/messages/:messageId/read
 * Mark a message as read
 */
router.put('/:messageId/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Cannot mark this message as read' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// ==================== GET UNREAD COUNT ====================
/**
 * GET /api/messages/unread/count
 * Get count of unread messages
 */
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ==================== GET CONVERSATIONS ====================
/**
 * GET /api/messages/conversations
 * Get list of all conversations with last message
 */
router.get('/conversations/list', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all friends
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
            avatarUrl: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get last message with each friend
    const conversations = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId = friendship.userId1 === userId ? friendship.user2.id : friendship.user1.id;
        const friend = friendship.userId1 === userId ? friendship.user2 : friendship.user1;

        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: friendId },
              { senderId: friendId, receiverId: userId },
            ],
          },
          orderBy: { sentAt: 'desc' },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: friendId,
            receiverId: userId,
            isRead: false,
          },
        });

        return {
          friend,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessage?.sentAt || new Date(0);
      const timeB = b.lastMessage?.sentAt || new Date(0);
      return timeB - timeA;
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

module.exports = router;
