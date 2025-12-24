/**
 * IMPROVED Socket.IO Configuration
 * - Fixed memory leaks
 * - Added message ACK
 * - Enhanced security
 * - Connection timeout handling
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store online users: Map<userId, {socketId, lastActivity}>
const onlineUsers = new Map();

// Store user rooms: Map<userId, Set<roomId>>
const userRooms = new Map();

// Connection timeout: 5 minutes of inactivity
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

/**
 * Initialize Socket.IO server
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ==================== CLEANUP INTERVAL ====================
  // Remove stale connections every 5 minutes
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    onlineUsers.forEach((userData, userId) => {
      if (now - userData.lastActivity > CONNECTION_TIMEOUT) {
        onlineUsers.delete(userId);
        userRooms.delete(userId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} stale connections`);
    }
  }, 5 * 60 * 1000);

  // ==================== AUTHENTICATION MIDDLEWARE ====================
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

  // ==================== CONNECTION HANDLER ====================
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${socket.user.username} (${userId})`);

    // Add user to online users with activity tracking
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastActivity: Date.now()
    });

    // Initialize user rooms
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }

    // Broadcast user online status to their friends
    broadcastUserStatus(io, userId, 'online');

    // Update activity on any event
    const updateActivity = () => {
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.lastActivity = Date.now();
      }
    };

    // ==================== JOIN CHAT ROOM ====================
    socket.on('chat:join', async (data, callback) => {
      updateActivity();
      
      try {
        const { otherUserId } = data;

        if (!otherUserId) {
          const error = { success: false, message: 'otherUserId is required' };
          return callback ? callback(error) : socket.emit('error', error);
        }

        // SECURITY: Verify friendship exists
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
          const error = { success: false, message: 'Can only chat with friends' };
          return callback ? callback(error) : socket.emit('error', error);
        }

        // Create normalized room ID
        const roomId = [userId, otherUserId].sort().join('-');

        // Join the room
        socket.join(roomId);
        userRooms.get(userId).add(roomId);

        console.log(`💬 ${socket.user.username} joined room: ${roomId}`);

        const response = { success: true, roomId, otherUserId };
        if (callback) callback(response);
        socket.emit('chat:joined', response);
      } catch (error) {
        console.error('Join room error:', error);
        const err = { success: false, message: 'Failed to join chat room' };
        return callback ? callback(err) : socket.emit('error', err);
      }
    });

    // ==================== LEAVE CHAT ROOM ====================
    socket.on('chat:leave', (data, callback) => {
      updateActivity();
      
      try {
        const { otherUserId } = data;
        const roomId = [userId, otherUserId].sort().join('-');

        socket.leave(roomId);
        userRooms.get(userId)?.delete(roomId);

        console.log(`👋 ${socket.user.username} left room: ${roomId}`);
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Leave room error:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // ==================== SEND MESSAGE WITH ACK ====================
    socket.on('message:send', async (data, callback) => {
      updateActivity();
      
      try {
        const { receiverId, content, type = 'text', tempId } = data;

        // Validation
        if (!content || !receiverId) {
          const error = { success: false, message: 'Content and receiverId required' };
          return callback ? callback(error) : socket.emit('error', error);
        }

        if (content.length > 5000) {
          const error = { success: false, message: 'Message too long (max 5000 characters)' };
          return callback ? callback(error) : socket.emit('error', error);
        }

        // SECURITY: Verify friendship
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
          const error = { success: false, message: 'Can only message friends' };
          return callback ? callback(error) : socket.emit('error', error);
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
        io.to(roomId).emit('message:new', { ...message, tempId });

        // ACK: Confirm message sent
        if (callback) {
          callback({ 
            success: true, 
            message,
            tempId 
          });
        }

        // Send notification if receiver not in room
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData) {
          const receiverRooms = userRooms.get(receiverId) || new Set();
          if (!receiverRooms.has(roomId)) {
            io.to(receiverData.socketId).emit('message:notification', {
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
        const err = { success: false, message: 'Failed to send message' };
        return callback ? callback(err) : socket.emit('error', err);
      }
    });

    // ==================== TYPING INDICATOR ====================
    socket.on('typing:start', (data) => {
      updateActivity();
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');

      socket.to(roomId).emit('typing:user', {
        userId,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data) => {
      updateActivity();
      const { receiverId } = data;
      const roomId = [userId, receiverId].sort().join('-');

      socket.to(roomId).emit('typing:user', {
        userId,
        username: socket.user.username,
        isTyping: false,
      });
    });

    // ==================== MESSAGE READ ====================
    socket.on('message:read', async (data, callback) => {
      updateActivity();
      
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
        const senderData = onlineUsers.get(senderId);
        if (senderData) {
          io.to(senderData.socketId).emit('message:read', {
            messageId,
            readBy: userId,
            readAt: new Date(),
          });
        }

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Mark read error:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // ==================== GET ONLINE FRIENDS ====================
    socket.on('friends:online', async (data, callback) => {
      updateActivity();
      
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

        const response = { success: true, onlineFriends };
        if (callback) callback(response);
        socket.emit('friends:online', response);
      } catch (error) {
        console.error('Get online friends error:', error);
        const err = { success: false, message: error.message };
        if (callback) callback(err);
      }
    });

    // ==================== HEARTBEAT (Keep-alive) ====================
    socket.on('heartbeat', (data, callback) => {
      updateActivity();
      if (callback) callback({ success: true, timestamp: Date.now() });
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.username} (${userId}) - Reason: ${reason}`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Clear rooms
      userRooms.delete(userId);

      // Broadcast user offline status
      broadcastUserStatus(io, userId, 'offline');
    });

    // ==================== ERROR HANDLER ====================
    socket.on('error', (error) => {
      console.error(`Socket error from ${socket.user.username}:`, error);
    });
  });

  console.log('🔌 Socket.IO server initialized with enhanced security');
  return io;
}

/**
 * Broadcast user status to their friends
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
      const friendData = onlineUsers.get(friendId);
      if (friendData) {
        io.to(friendData.socketId).emit('user:status', {
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
 */
function getOnlineUsersCount() {
  return onlineUsers.size;
}

/**
 * Check if user is online
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Force disconnect user (admin function)
 */
function disconnectUser(io, userId) {
  const userData = onlineUsers.get(userId);
  if (userData) {
    io.to(userData.socketId).disconnectSockets(true);
    onlineUsers.delete(userId);
    userRooms.delete(userId);
    return true;
  }
  return false;
}

module.exports = {
  initializeSocket,
  getOnlineUsersCount,
  isUserOnline,
  disconnectUser,
};
