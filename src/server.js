require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./config/logger');
const { generalLimiter, authLimiter, scoreLimiter, postLimiter } = require('./middleware/rate-limiter');
const { errorHandler } = require('./middleware/error-handler');
const { sanitizeInput } = require('./middleware/sanitize');
const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');
const postsRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const achievementsRoutes = require('./routes/achievements');
const usersRoutes = require('./routes/users');
const challengesRoutes = require('./routes/challenges');

// Game routes
const guessNumberRoutes = require('./routes/games/guess-number');
const cowsBullsRoutes = require('./routes/games/cows-bulls');
const memoryMatchRoutes = require('./routes/games/memory-match');
const quickMathRoutes = require('./routes/games/quick-math');

const { swaggerUi, swaggerSpec } = require('./config/swagger');
const path = require('path');
const puzzleRoutes = require('./routes/puzzle');

const sudokuRoutes = require('./routes/sudoku');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization (apply globally)
app.use(sanitizeInput);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ req: { method: req.method, url: req.path, ip: req.ip } }, 'Incoming request');
  next();
});

// ==================== DATABASE CONNECTION ====================
connectDB();

// ==================== SWAGGER CONFIG ====================
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==================== ROUTES ====================
app.get('/', (req, res) => {
  res.json({
    message: '🎮 Game Mobile API - Server is running!',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      scores: '/api/scores',
      friends: '/api/friends',
      messages: '/api/messages',
      posts: '/api/posts',
      upload: '/api/upload',
      achievements: '/api/achievements',
      users: '/api/users',
      challenges: '/api/challenges',
      games: {
        guessNumber: '/api/games/guess-number',
        cowsBulls: '/api/games/cows-bulls',
        memoryMatch: '/api/games/memory-match',
        quickMath: '/api/games/quick-math',
      },
    },
  });
});


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// ==================== API DOCUMENTATION ====================
// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '🎮 Mini Game Center API Docs',
}));

// Redirect /docs to /api-docs
app.get('/docs', (req, res) => {
  res.redirect('/api-docs');
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

// Users routes (profile management)
app.use('/api/users', usersRoutes);

// Challenge routes (PK system)
app.use('/api/challenges', authenticateToken, challengesRoutes);


app.use('/api/puzzle', puzzleRoutes);
// Game logic routes (protected, require auth)
app.use('/api/games/guess-number', authenticateToken, generalLimiter, guessNumberRoutes);
app.use('/api/games/cows-bulls', authenticateToken, generalLimiter, cowsBullsRoutes);
app.use('/api/games/memory-match', authenticateToken, generalLimiter, memoryMatchRoutes);
app.use('/api/games/quick-math', authenticateToken, generalLimiter, quickMathRoutes);

// ==================== ERROR HANDLING ====================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

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
