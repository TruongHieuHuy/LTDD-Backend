/**
 * Input Validation & Sanitization Middleware
 * Prevents XSS, SQL Injection, and validates data
 */
const validator = require('validator');
const xss = require('xss');

/**
 * Validate and sanitize username
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }

  const sanitized = xss(validator.trim(username));
  
  if (sanitized.length < 3 || sanitized.length > 20) {
    return { valid: false, message: 'Username must be 3-20 characters' };
  }

  // Only alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true, value: sanitized };
};

/**
 * Validate email
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }

  const sanitized = validator.normalizeEmail(email);

  if (!validator.isEmail(sanitized)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true, value: sanitized };
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!hasUpperCase || !hasLowerCase) {
    return { valid: false, message: 'Password must contain both uppercase and lowercase letters' };
  }

  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  // Common passwords blacklist
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567890', 'letmein', 'trustno1', 'dragon'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common. Please choose a stronger password' };
  }

  return { valid: true };
};

/**
 * Validate game score with anti-cheat checks
 */
const validateGameScore = (gameType, score, difficulty, timeSpent) => {
  // Game-specific limits
  const GAME_LIMITS = {
    rubik: { 
      maxScore: 1000, 
      minTime: 10,
      scorePerSecond: 50
    },
    sudoku: { 
      maxScore: 500, 
      minTime: 30,
      scorePerSecond: 10
    },
    caro: { 
      maxScore: 300, 
      minTime: 20,
      scorePerSecond: 15
    },
    puzzle: { 
      maxScore: 800, 
      minTime: 15,
      scorePerSecond: 30
    }
  };

  const gameLimit = GAME_LIMITS[gameType];
  if (!gameLimit) {
    return { valid: false, message: `Invalid game type: ${gameType}` };
  }

  // Validate score range
  if (score < 0 || score > gameLimit.maxScore) {
    return { 
      valid: false, 
      message: `Invalid score for ${gameType}. Must be 0-${gameLimit.maxScore}` 
    };
  }

  // Validate minimum time (anti speed-hack)
  if (timeSpent < gameLimit.minTime) {
    return { 
      valid: false, 
      message: `Suspicious activity detected: Game completed too fast (${timeSpent}s). Minimum time is ${gameLimit.minTime}s` 
    };
  }

  // Validate score/time ratio
  const scorePerSecond = score / timeSpent;
  if (scorePerSecond > gameLimit.scorePerSecond) {
    return { 
      valid: false, 
      message: 'Suspicious activity detected: Score per second ratio is unrealistic' 
    };
  }

  // Difficulty-based maximum validation
  const DIFFICULTY_MULTIPLIERS = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    expert: 3.0
  };

  const expectedMaxScore = gameLimit.maxScore * DIFFICULTY_MULTIPLIERS[difficulty];
  if (score > expectedMaxScore) {
    return { 
      valid: false, 
      message: `Score ${score} is too high for ${difficulty} difficulty (max: ${expectedMaxScore})` 
    };
  }

  return { valid: true };
};

/**
 * Calculate normalized score for fair game balance
 */
const calculateNormalizedScore = (gameType, score, difficulty, timeSpent) => {
  // Base weights based on game complexity
  const GAME_WEIGHTS = {
    rubik: 2.5,    // Hardest game
    sudoku: 2.0,   // Medium-hard
    caro: 1.5,     // Medium
    puzzle: 1.0    // Easiest
  };

  // Difficulty bonuses
  const DIFFICULTY_BONUS = {
    easy: 1.0,
    medium: 1.3,
    hard: 1.7,
    expert: 2.2
  };

  // Time bonus (encourages longer play sessions)
  // Max +50% bonus for playing >10 minutes
  const timeBonus = Math.min(1.5, 1 + (timeSpent / 600));

  // Formula: Base Score × Game Weight × Difficulty Bonus × Time Bonus
  const normalizedScore = Math.round(
    score * GAME_WEIGHTS[gameType] * DIFFICULTY_BONUS[difficulty] * timeBonus
  );

  return normalizedScore;
};

/**
 * Sanitize text content (for posts, comments, messages)
 */
const sanitizeContent = (content, maxLength = 5000) => {
  if (!content || typeof content !== 'string') {
    return { valid: false, message: 'Content is required' };
  }

  // Remove XSS attacks but keep basic formatting
  const sanitized = xss(content, {
    whiteList: {}, // Remove all HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });

  const trimmed = validator.trim(sanitized);

  if (trimmed.length === 0) {
    return { valid: false, message: 'Content cannot be empty' };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, message: `Content too long (max ${maxLength} characters)` };
  }

  return { valid: true, value: trimmed };
};

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validateGameScore,
  calculateNormalizedScore,
  sanitizeContent
};
