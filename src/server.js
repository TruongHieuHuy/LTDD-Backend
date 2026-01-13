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
const caroRoutes = require('./routes/caro'); // 👈 NEW
const puzzleRoutes = require('./routes/puzzle');
const rubikRoutes = require('./routes/rubik');

const sudokuRoutes = require('./routes/sudoku');
const adminRoutes = require('./routes/admin');

const app = express();

// ==================== ROUTES ====================
app.get('/debug-probe', (req, res) => {
  res.json({
    message: 'Antigravity probe active',
    timestamp: new Date().toISOString()
  });
});

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization (apply globally)
// ==================== API DOCUMENTATION ====================
// Swagger UI
logger.info('Setup Swagger UI...');
logger.info(`Swagger Spec available: ${!!swaggerSpec}`);
if (swaggerSpec) {
  logger.info({ info: swaggerSpec.info }, 'Swagger Spec info');
  logger.info(`Swagger Spec paths count: ${Object.keys(swaggerSpec.paths || {}).length}`);
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '🎮 Mini Game Center API Docs',
}));

// Input sanitization (apply to API routes)
app.use(sanitizeInput);

// Redirect /docs to /api-docs
app.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});
// Feature Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/scores', authenticateToken, scoreLimiter, scoresRoutes);
app.use('/api/friends', authenticateToken, generalLimiter, friendsRoutes);
app.use('/api/messages', authenticateToken, generalLimiter, messagesRoutes);
app.use('/api/posts', authenticateToken, postLimiter, postsRoutes);
app.use('/api/upload', authenticateToken, generalLimiter, uploadRoutes);
app.use('/api/achievements', generalLimiter, achievementsRoutes);
app.use('/api/users', generalLimiter, usersRoutes);
app.use('/api/challenges', authenticateToken, generalLimiter, challengesRoutes);
app.use('/api/admin', generalLimiter, adminRoutes);

app.use('/api/puzzle', puzzleRoutes);

// Sudoku routes
app.use('/api/sudoku', sudokuRoutes);

// Game logic routes (protected, require auth)
app.use('/api/games/guess-number', authenticateToken, generalLimiter, guessNumberRoutes);
app.use('/api/games/cows-bulls', authenticateToken, generalLimiter, cowsBullsRoutes);
app.use('/api/games/memory-match', authenticateToken, generalLimiter, memoryMatchRoutes);
app.use('/api/games/quick-math', authenticateToken, generalLimiter, quickMathRoutes);

app.use('/api/caro', caroRoutes);
app.use('/api/rubik', rubikRoutes);


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
  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    logger.info('='.repeat(50));
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Local URL: http://localhost:${PORT}`);
    logger.info(`🌐 Network URL: http://0.0.0.0:${PORT} (accessible from LAN)`);

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
