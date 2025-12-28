/**
 * Socket.IO Configuration
 * Real-time communication for chat and notifications
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { prisma } = require('./database'); // Use the shared Prisma instance
const logger = require('./logger');

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
async function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Create Redis clients for pub/sub
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Use Redis adapter
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Redis Adapter connected successfully');
  } catch (err) {
    logger.warn('⚠️ Redis connection failed - Falling back to in-memory adapter');
    logger.warn(`Redis Error: ${err.message}`);
  }

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
      logger.error({ err: error, socketId: socket.id }, 'Socket authentication error');
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info({ user: socket.user.username, id: userId, socketId: socket.id }, '✅ User connected');

    // Join a room identified by the user's ID for presence tracking
    socket.join(userId);

    // Broadcast user online status to their friends
    broadcastUserStatus(io, userId, 'online');

    // ==================== JOIN CHAT ROOM ====================
    socket.on('chat:join', async (data) => {
      try {
        const { otherUserId } = data;
        const roomId = [userId, otherUserId].sort().join('-');

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

        socket.join(roomId);
        logger.info({ user: socket.user.username, room: roomId }, '💬 User joined room');
        socket.emit('chat:joined', { roomId, otherUserId });
      } catch (error) {
        logger.error({ err: error, user: socket.user.username }, 'Join room error');
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // ==================== LEAVE CHAT ROOM ====================
    socket.on('chat:leave', (data) => {
      const { otherUserId } = data;
      const roomId = [userId, otherUserId].sort().join('-');
      socket.leave(roomId);
      logger.info({ user: socket.user.username, room: roomId }, '👋 User left room');
    });

    // ==================== SEND MESSAGE ====================
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content, type = 'text' } = data;

        if (!content || !receiverId) {
          return socket.emit('error', { message: 'Content and receiverId required' });
        }

        const friendship = await prisma.friendship.findFirst({
          where: { OR: [{ userId1: userId, userId2: receiverId }, { userId1: receiverId, userId2: userId }], isBlocked: false },
        });

        if (!friendship) {
          return socket.emit('error', { message: 'Can only message friends' });
        }

        const message = await prisma.message.create({
          data: { senderId: userId, receiverId, content, type },
          include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
        });

        const roomId = [userId, receiverId].sort().join('-');
        io.to(roomId).emit('message:new', message);

        // If receiver is online but not in the chat room, send a notification
        const receiverSockets = await io.in(receiverId).fetchSockets();
        if (receiverSockets.length > 0) {
          const isReceiverInChat = receiverSockets.some(sock => sock.rooms.has(roomId));
          if (!isReceiverInChat) {
            io.to(receiverId).emit('message:notification', {
              senderId: userId,
              senderName: socket.user.username,
              content: content.substring(0, 50),
              messageId: message.id,
            });
          }
        }
        
        logger.info({ from: socket.user.username, to: receiverId }, '📨 Message sent');
      } catch (error) {
        logger.error({ err: error, user: socket.user.username }, 'Send message error');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== TYPING INDICATOR ====================
    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');
      socket.to(roomId).emit('typing:user', { userId, username: socket.user.username, isTyping: true });
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');
      socket.to(roomId).emit('typing:user', { userId, username: socket.user.username, isTyping: false });
    });

    // ==================== MESSAGE READ ====================
    socket.on('message:read', async (data) => {
      try {
        const { messageId, senderId } = data;
        await prisma.message.update({ where: { id: messageId }, data: { isRead: true, readAt: new Date() } });
        io.to(senderId).emit('message:read', { messageId, readBy: userId, readAt: new Date() });
      } catch (error) {
        logger.error({ err: error, user: userId, messageId: data.messageId }, 'Mark read error');
      }
    });

    // ==================== GET ONLINE FRIENDS ====================
    socket.on('friends:online', async () => {
      try {
        const friendships = await prisma.friendship.findMany({
          where: { OR: [{ userId1: userId }, { userId2: userId }], isBlocked: false },
        });

        const friendIds = friendships.map(f => f.userId1 === userId ? f.userId2 : f.userId1);
        const onlineFriends = [];
        for (const friendId of friendIds) {
          const sockets = await io.in(friendId).fetchSockets();
          if (sockets.length > 0) {
            onlineFriends.push(friendId);
          }
        }
        socket.emit('friends:online', { onlineFriends });
      } catch (error) {
        logger.error({ err: error, user: userId }, 'Get online friends error');
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', () => {
      logger.info({ user: socket.user.username, id: userId, socketId: socket.id }, '❌ User disconnected');
      broadcastUserStatus(io, userId, 'offline');
    });

    // ==================== ERROR HANDLER ====================
    socket.on('error', (error) => {
      logger.error({ err: error, socketId: socket.id }, 'Socket error event');
    });
  });

  logger.info('🔌 Socket.IO server initialized with Redis Adapter');
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
      where: { OR: [{ userId1: userId }, { userId2: userId }], isBlocked: false },
    });
    const friendIds = friendships.map(f => f.userId1 === userId ? f.userId2 : f.userId1);

    // Notify online friends by emitting to their dedicated room
    friendIds.forEach(friendId => {
      io.to(friendId).emit('user:status', { userId, status, timestamp: new Date() });
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'Broadcast status error');
  }
}

/**
 * Get online users count (approximated)
 * @returns {Promise<number>} Number of online users
 */
async function getOnlineUsersCount(io) {
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Check if user is online
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is online
 */
async function isUserOnline(io, userId) {
  const sockets = await io.in(userId).fetchSockets();
  return sockets.length > 0;
}

module.exports = {
  initializeSocket,
  getOnlineUsersCount,
  isUserOnline,
};
