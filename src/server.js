require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./config/logger');
const { generalLimiter, authLimiter, scoreLimiter, postLimiter } = require('./middleware/rate-limiter');
const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');
const postsRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const achievementsRoutes = require('./routes/achievements');
const path = require('path');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ req: { method: req.method, url: req.path, ip: req.ip } }, 'Incoming request');
  next();
});

// ==================== DATABASE CONNECTION ====================
connectDB();

// ==================== RATE LIMITING ====================
app.use('/api/', generalLimiter);

// ==================== ROUTES ====================
app.get('/', (req, res) => {
  res.json({
    message: '🎮 Game Mobile API - Server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      scores: '/api/scores',
      friends: '/api/friends',
      messages: '/api/messages',
      posts: '/api/posts',
      upload: '/api/upload',
      achievements: '/api/achievements',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/scores', authenticateToken, scoreLimiter, scoresRoutes);

// Protected routes (require authentication)
app.use('/api/friends', authenticateToken, friendsRoutes);
app.use('/api/messages', authenticateToken, messagesRoutes);
app.use('/api/posts', authenticateToken, postLimiter, postsRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);

// Achievements routes (some require auth, some are public)
app.use('/api/achievements', achievementsRoutes);

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, req: { method: req.method, url: req.path } }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

async function startServer() {
  const httpServer = app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Base URL: http://localhost:${PORT}`);

    // Add CORS warning for production
    if (process.env.NODE_ENV === 'production' && (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*')) {
      logger.warn('==================== SECURITY WARNING ====================');
      logger.warn('CORS_ORIGIN is not set or is a wildcard (*).');
      logger.warn('This is insecure for production. Set it to your frontend domain.');
      logger.warn('========================================================');
    }
    logger.info('='.repeat(50));
  });

  // ==================== SOCKET.IO SETUP ====================
  try {
    const { initializeSocket } = require('./config/socket');
    const io = await initializeSocket(httpServer);

    // Make io accessible to routes
    app.set('io', io);
    logger.info('💬 Real-time chat enabled with Redis Adapter.');
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to initialize Socket.IO with Redis');
    process.exit(1);
  }
}

startServer();
