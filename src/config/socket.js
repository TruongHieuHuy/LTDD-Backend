/**
 * Socket.IO Configuration
 * Real-time communication for chat and notifications
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store online users: Map<userId, socketId>
const onlineUsers = new Map();

// Store user rooms: Map<userId, Set<roomId>>
const userRooms = new Map();

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${socket.user.username} (${userId})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);

    // Initialize user rooms
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }

    // Broadcast user online status to their friends
    broadcastUserStatus(io, userId, 'online');

    // ==================== JOIN CHAT ROOM ====================
    socket.on('chat:join', async (data) => {
      try {
        const { otherUserId } = data;

        // Create room ID (normalized: smaller ID first)
        const roomId = [userId, otherUserId].sort().join('-');

        // Check if they are friends
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId1: userId, userId2: otherUserId },
              { userId1: otherUserId, userId2: userId },
            ],
            isBlocked: false,
          },
        });

        if (!friendship) {
          socket.emit('error', { message: 'Can only chat with friends' });
          return;
        }

        // Join the room
        socket.join(roomId);
        userRooms.get(userId).add(roomId);

        console.log(`💬 ${socket.user.username} joined room: ${roomId}`);

        socket.emit('chat:joined', { roomId, otherUserId });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // ==================== LEAVE CHAT ROOM ====================
    socket.on('chat:leave', (data) => {
      const { otherUserId } = data;
      const roomId = [userId, otherUserId].sort().join('-');

      socket.leave(roomId);
      userRooms.get(userId)?.delete(roomId);

      console.log(`👋 ${socket.user.username} left room: ${roomId}`);
    });

    // ==================== SEND MESSAGE ====================
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content, type = 'text' } = data;

        if (!content || !receiverId) {
          socket.emit('error', { message: 'Content and receiverId required' });
          return;
        }

        // Check if they are friends
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId1: userId, userId2: receiverId },
              { userId1: receiverId, userId2: userId },
            ],
            isBlocked: false,
          },
        });

        if (!friendship) {
          socket.emit('error', { message: 'Can only message friends' });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            senderId: userId,
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

        // Emit to room
        const roomId = [userId, receiverId].sort().join('-');
        io.to(roomId).emit('message:new', message);

        // If receiver is online but not in room, send notification
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          const receiverRooms = userRooms.get(receiverId) || new Set();
          if (!receiverRooms.has(roomId)) {
            io.to(receiverSocketId).emit('message:notification', {
              senderId: userId,
              senderName: socket.user.username,
              content: content.substring(0, 50),
              messageId: message.id,
            });
          }
        }

        console.log(`📨 Message from ${socket.user.username} to ${receiverId}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== TYPING INDICATOR ====================
    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');

      socket.to(roomId).emit('typing:user', {
        userId,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');

      socket.to(roomId).emit('typing:user', {
        userId,
        username: socket.user.username,
        isTyping: false,
      });
    });

    // ==================== MESSAGE READ ====================
    socket.on('message:read', async (data) => {
      try {
        const { messageId, senderId } = data;

        // Update message as read
        await prisma.message.update({
          where: { id: messageId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        // Notify sender
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', {
            messageId,
            readBy: userId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // ==================== GET ONLINE FRIENDS ====================
    socket.on('friends:online', async () => {
      try {
        // Get user's friends
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { userId1: userId },
              { userId2: userId },
            ],
            isBlocked: false,
          },
        });

        const friendIds = friendships.map(f => 
          f.userId1 === userId ? f.userId2 : f.userId1
        );

        // Check which friends are online
        const onlineFriends = friendIds.filter(id => onlineUsers.has(id));

        socket.emit('friends:online', { onlineFriends });
      } catch (error) {
        console.error('Get online friends error:', error);
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.username} (${userId})`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Clear rooms
      userRooms.delete(userId);

      // Broadcast user offline status
      broadcastUserStatus(io, userId, 'offline');
    });

    // ==================== ERROR HANDLER ====================
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.IO server initialized');
  return io;
}

/**
 * Broadcast user status to their friends
 * @param {Server} io - Socket.IO server instance
 * @param {string} userId - User ID
 * @param {string} status - User status (online/offline)
 */
async function broadcastUserStatus(io, userId, status) {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: userId },
          { userId2: userId },
        ],
        isBlocked: false,
      },
    });

    const friendIds = friendships.map(f => 
      f.userId1 === userId ? f.userId2 : f.userId1
    );

    // Notify online friends
    friendIds.forEach(friendId => {
      const friendSocketId = onlineUsers.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit('user:status', {
          userId,
          status,
          timestamp: new Date(),
        });
      }
    });
  } catch (error) {
    console.error('Broadcast status error:', error);
  }
}

/**
 * Get online users count
 * @returns {number} Number of online users
 */
function getOnlineUsersCount() {
  return onlineUsers.size;
}

/**
 * Check if user is online
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is online
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = {
  initializeSocket,
  getOnlineUsersCount,
  isUserOnline,
};
