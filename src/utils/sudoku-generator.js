/**
 * Sudoku Generator Utility
 * Fixed version with proper randomization
 */

/**
 * Generate a fully solved Sudoku board (9x9)
 * @returns {number[]} 81 numbers (1-9) representing the solution
 */
function generateFullBoard() {
  const board = Array(9).fill(null).map(() => Array(9).fill(0));
  
  // Fill diagonal 3x3 boxes first (they don't affect each other)
  fillDiagonal(board);
  
  // Solve the rest using backtracking
  if (!solveSudoku(board)) {
    console.error('Failed to solve board, retrying...');
    return generateFullBoard(); // Retry if failed
  }
  
  // Convert 2D to 1D array
  const result = board.flat();
  
  // Validate result
  if (result.length !== 81 || result.some(n => n < 1 || n > 9)) {
    console.error('Invalid board generated, retrying...');
    return generateFullBoard();
  }
  
  return result;
}

/**
 * Fill the 3 diagonal 3x3 boxes
 */
function fillDiagonal(board) {
  for (let box = 0; box < 9; box += 3) {
    fillBox(board, box, box);
  }
}

/**
 * Fill a 3x3 box with random numbers 1-9
 */
function fillBox(board, row, col) {
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  let idx = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      board[row + i][col + j] = nums[idx++];
    }
  }
}

/**
 * Solve Sudoku using backtracking with randomization
 */
function solveSudoku(board) {
  const emptyCell = findEmptyCell(board);
  
  if (!emptyCell) {
    return true; // Solved
  }
  
  const [row, col] = emptyCell;
  
  // Try numbers 1-9 in random order
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      
      if (solveSudoku(board)) {
        return true;
      }
      
      board[row][col] = 0; // Backtrack
    }
  }
  
  return false;
}

/**
 * Find first empty cell (0)
 */
function findEmptyCell(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return [row, col];
      }
    }
  }
  return null;
}

/**
 * Check if placing num at (row, col) is valid
 */
function isValid(board, row, col, num) {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }
  
  // Check column
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false;
  }
  
  // Check 3x3 box
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  
  return true;
}

/**
 * Create a puzzle by removing numbers from solution
 * @param {number[]} solution - 81 numbers (1-9)
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {number[]} puzzle with some cells set to 0
 */
function createPuzzle(solution, difficulty) {
  const cellsToRemove = getCellsToRemove(difficulty);
  const puzzle = [...solution];
  
  // Create array of indices [0, 1, 2, ..., 80] and shuffle
  const indices = shuffle(Array.from({ length: 81 }, (_, i) => i));
  
  // Remove cells randomly
  for (let i = 0; i < cellsToRemove && i < indices.length; i++) {
    puzzle[indices[i]] = 0;
  }
  
  return puzzle;
}

/**
 * Get number of cells to remove based on difficulty
 */
function getCellsToRemove(difficulty) {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 35;  // Keep 46 numbers
    case 'medium':
      return 45;  // Keep 36 numbers
    case 'hard':
      return 55;  // Keep 26 numbers
    default:
      return 40;
  }
}

/**
 * Calculate score based on difficulty and performance
 * @param {Object} params
 * @param {string} params.difficulty
 * @param {number} params.timeInSeconds
 * @param {number} params.hintsUsed
 * @param {number} params.mistakes
 * @returns {number} final score
 */
function calculateScore({ difficulty, timeInSeconds, hintsUsed, mistakes }) {
  // Base score based on difficulty
  const baseScores = {
    easy: 2000,
    medium: 4000,
    hard: 6000,
  };
  
  const baseScore = baseScores[difficulty.toLowerCase()] || 2000;
  
  // Target time (in seconds)
  const targetTimes = {
    easy: 300,    // 5 minutes
    medium: 600,  // 10 minutes
    hard: 900,    // 15 minutes
  };
  
  const targetTime = targetTimes[difficulty.toLowerCase()] || 300;
  
  // Time bonus/penalty
  const timeDiff = targetTime - timeInSeconds;
  const maxBonus = Math.floor(baseScore * 0.5);
  const timeBonus = Math.max(-maxBonus, Math.min(maxBonus, timeDiff * 2));
  
  // Penalties
  const hintPenalty = hintsUsed * 50;
  const mistakePenalty = mistakes * 50;
  
  // Calculate final score (must be >= 0)
  const finalScore = Math.max(0, baseScore + timeBonus - hintPenalty - mistakePenalty);
  
  return Math.floor(finalScore);
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new copy)
 */
function shuffle(array) {
  const arr = [...array]; // Create copy to avoid mutating original
  
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr;
}

/**
 * Validate a completed Sudoku board
 * @param {number[]} board - 81 numbers
 * @returns {boolean} true if valid
 */
function validateBoard(board) {
  if (board.length !== 81) return false;
  
  // Convert to 2D
  const board2D = [];
  for (let i = 0; i < 9; i++) {
    board2D.push(board.slice(i * 9, (i + 1) * 9));
  }
  
  // Check rows
  for (let row = 0; row < 9; row++) {
    const seen = new Set();
    for (let col = 0; col < 9; col++) {
      const num = board2D[row][col];
      if (num < 1 || num > 9 || seen.has(num)) return false;
      seen.add(num);
    }
  }
  
  // Check columns
  for (let col = 0; col < 9; col++) {
    const seen = new Set();
    for (let row = 0; row < 9; row++) {
      const num = board2D[row][col];
      if (seen.has(num)) return false;
      seen.add(num);
    }
  }
  
  // Check 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const num = board2D[boxRow * 3 + i][boxCol * 3 + j];
          if (seen.has(num)) return false;
          seen.add(num);
        }
      }
    }
  }
  
  return true;
}

module.exports = {
  generateFullBoard,
  createPuzzle,
  calculateScore,
  solveSudoku,
  isValid,
  validateBoard,
};