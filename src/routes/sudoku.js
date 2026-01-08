const express = require('express');
const router = express.Router();

// Import helper functions
const { generateFullBoard, createPuzzle, calculateScore, validateBoard } = require('../utils/sudoku-generator');

/**
 * POST /api/sudoku/generate
 * Generate a new Sudoku game
 * Body: { difficulty: 'easy' | 'medium' | 'hard' }
 * Response: { gameId, puzzle, solution, difficulty }
 */
router.post('/generate', async (req, res) => {
  try {
    const { difficulty } = req.body;

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    const normalizedDifficulty = (difficulty || 'easy').toLowerCase();
    
    if (!validDifficulties.includes(normalizedDifficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`,
      });
    }

    // Generate game
    console.log('🎲 Generating Sudoku board...');
    const solution = generateFullBoard();
    
    // Validate solution
    if (!validateBoard(solution)) {
      console.error('❌ Generated invalid board!');
      throw new Error('Generated invalid Sudoku board');
    }
    
    console.log('✅ Valid solution generated');
    console.log('   Sample (first 9):', solution.slice(0, 9));
    
    const puzzle = createPuzzle(solution, normalizedDifficulty);
    
    // Count empty cells
    const emptyCells = puzzle.filter(n => n === 0).length;
    console.log(`📊 Puzzle created with ${emptyCells} empty cells`);
    
    const gameId = `sudoku_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return game data
    res.json({
      success: true,
      data: {
        gameId,
        puzzle,
        solution,
        difficulty: normalizedDifficulty,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Generate Sudoku error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Sudoku game',
      error: error.message,
    });
  }
});

/**
 * POST /api/sudoku/validate
 * Validate a Sudoku solution
 * Body: { currentState: [81 numbers], solution: [81 numbers] }
 * Response: { isValid, mistakes: number, errors: [indices] }
 */
router.post('/validate', async (req, res) => {
  try {
    const { currentState, solution } = req.body;

    // Validate input
    if (!Array.isArray(currentState) || currentState.length !== 81) {
      return res.status(400).json({
        success: false,
        message: 'currentState must be an array of 81 numbers',
      });
    }

    if (!Array.isArray(solution) || solution.length !== 81) {
      return res.status(400).json({
        success: false,
        message: 'solution must be an array of 81 numbers',
      });
    }

    // Find mistakes
    const mistakes = [];
    let mistakeCount = 0;

    for (let i = 0; i < 81; i++) {
      if (currentState[i] !== 0 && currentState[i] !== solution[i]) {
        mistakes.push(i);
        mistakeCount++;
      }
    }

    // Check if completed
    const isCompleted = currentState.every((val, idx) => val === solution[idx]);

    res.json({
      success: true,
      data: {
        isValid: mistakes.length === 0,
        isCompleted,
        mistakes: mistakeCount,
        errorIndices: mistakes,
      },
    });
  } catch (error) {
    console.error('Validate Sudoku error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate Sudoku',
      error: error.message,
    });
  }
});

/**
 * POST /api/sudoku/hint
 * Get a hint for the next move
 * Body: { currentState: [81 numbers], solution: [81 numbers] }
 * Response: { index: number, value: number }
 */
router.post('/hint', async (req, res) => {
  try {
    const { currentState, solution } = req.body;

    // Validate input
    if (!Array.isArray(currentState) || currentState.length !== 81) {
      return res.status(400).json({
        success: false,
        message: 'currentState must be an array of 81 numbers',
      });
    }

    if (!Array.isArray(solution) || solution.length !== 81) {
      return res.status(400).json({
        success: false,
        message: 'solution must be an array of 81 numbers',
      });
    }

    // Find first empty cell
    let hintIndex = -1;
    for (let i = 0; i < 81; i++) {
      if (currentState[i] === 0) {
        hintIndex = i;
        break;
      }
    }

    if (hintIndex === -1) {
      return res.json({
        success: true,
        data: {
          message: 'No empty cells found',
          index: null,
          value: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        index: hintIndex,
        value: solution[hintIndex],
        row: Math.floor(hintIndex / 9),
        col: hintIndex % 9,
      },
    });
  } catch (error) {
    console.error('Get hint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hint',
      error: error.message,
    });
  }
});

/**
 * POST /api/sudoku/calculate-score
 * Calculate final score
 * Body: { difficulty, timeInSeconds, hintsUsed, mistakes }
 * Response: { score: number }
 */
router.post('/calculate-score', async (req, res) => {
  try {
    const { difficulty, timeInSeconds, hintsUsed, mistakes } = req.body;

    // Validate required fields
    if (!difficulty || timeInSeconds === undefined) {
      return res.status(400).json({
        success: false,
        message: 'difficulty and timeInSeconds are required',
      });
    }

    const score = calculateScore({
      difficulty,
      timeInSeconds: parseInt(timeInSeconds),
      hintsUsed: parseInt(hintsUsed || 0),
      mistakes: parseInt(mistakes || 0),
    });

    res.json({
      success: true,
      data: { score },
    });
  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate score',
      error: error.message,
    });
  }
});

module.exports = router;