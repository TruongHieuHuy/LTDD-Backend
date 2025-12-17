require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');
const postsRoutes = require('./routes/posts');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ==================== DATABASE CONNECTION ====================
connectDB();

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
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);

// Protected routes (require authentication)
app.use('/api/friends', authenticateToken, friendsRoutes);
app.use('/api/messages', authenticateToken, messagesRoutes);
app.use('/api/posts', authenticateToken, postsRoutes);

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
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Server running on port', PORT);
  console.log('📝 Environment:', process.env.NODE_ENV || 'development');
  console.log('🌐 Base URL: http://localhost:' + PORT);
  console.log('='.repeat(50));
});
