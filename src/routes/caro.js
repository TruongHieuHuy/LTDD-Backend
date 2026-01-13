// Backend/src/routes/caro.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🎯 Minimax Algorithm with Alpha-Beta Pruning
 * Đánh giá vị trí và tìm nước đi tốt nhất cho máy
 */

// Hàm đánh giá điểm của một dãy
function evaluateLine(line, player) {
  const opponent = player === 'X' ? 'O' : 'X';
  const playerCount = line.filter(cell => cell === player).length;
  const opponentCount = line.filter(cell => cell === opponent).length;
  const emptyCount = line.filter(cell => cell === null).length;

  // Nếu có cả 2 quân thì không có giá trị
  if (playerCount > 0 && opponentCount > 0) return 0;

  // Đánh giá dựa trên số quân liên tiếp
  if (playerCount === 5) return 100000; // Thắng
  if (playerCount === 4 && emptyCount >= 1) return 10000; // 4 liên tiếp
  if (playerCount === 3 && emptyCount >= 2) return 1000; // 3 liên tiếp
  if (playerCount === 2 && emptyCount >= 3) return 100; // 2 liên tiếp
  if (playerCount === 1 && emptyCount >= 4) return 10; // 1 quân

  // Đánh giá phòng thủ (chặn đối thủ)
  if (opponentCount === 4 && emptyCount >= 1) return 9000; // Phải chặn ngay
  if (opponentCount === 3 && emptyCount >= 2) return 900;
  if (opponentCount === 2 && emptyCount >= 3) return 90;

  return 0;
}

// Đánh giá toàn bộ bàn cờ
function evaluateBoard(board, size, player) {
  let score = 0;

  // Kiểm tra hàng ngang
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 5; col++) {
      const line = [];
      for (let i = 0; i < 5; i++) {
        line.push(board[row][col + i]);
      }
      score += evaluateLine(line, player);
    }
  }

  // Kiểm tra hàng dọc
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 5; row++) {
      const line = [];
      for (let i = 0; i < 5; i++) {
        line.push(board[row + i][col]);
      }
      score += evaluateLine(line, player);
    }
  }

  // Kiểm tra chéo chính (\)
  for (let row = 0; row <= size - 5; row++) {
    for (let col = 0; col <= size - 5; col++) {
      const line = [];
      for (let i = 0; i < 5; i++) {
        line.push(board[row + i][col + i]);
      }
      score += evaluateLine(line, player);
    }
  }

  // Kiểm tra chéo phụ (/)
  for (let row = 4; row < size; row++) {
    for (let col = 0; col <= size - 5; col++) {
      const line = [];
      for (let i = 0; i < 5; i++) {
        line.push(board[row - i][col + i]);
      }
      score += evaluateLine(line, player);
    }
  }

  return score;
}

// Lấy các nước đi khả thi (chỉ xét xung quanh các quân đã đánh)
function getPossibleMoves(board, size) {
  const moves = new Set();
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] !== null) {
        // Tìm các ô trống xung quanh
        for (const [dr, dc] of directions) {
          const newRow = row + dr;
          const newCol = col + dc;
          if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
            if (board[newRow][newCol] === null) {
              moves.add(`${newRow},${newCol}`);
            }
          }
        }
      }
    }
  }

  // Nếu bàn cờ trống, đặt ở giữa
  if (moves.size === 0) {
    const center = Math.floor(size / 2);
    moves.add(`${center},${center}`);
  }

  return Array.from(moves).map(pos => {
    const [row, col] = pos.split(',').map(Number);
    return { row, col };
  });
}

// Kiểm tra thắng
function checkWin(board, size, player) {
  // Kiểm tra hàng ngang
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 5; col++) {
      let count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[row][col + i] === player) count++;
      }
      if (count === 5) return true;
    }
  }

  // Kiểm tra hàng dọc
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 5; row++) {
      let count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[row + i][col] === player) count++;
      }
      if (count === 5) return true;
    }
  }

  // Kiểm tra chéo chính
  for (let row = 0; row <= size - 5; row++) {
    for (let col = 0; col <= size - 5; col++) {
      let count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[row + i][col + i] === player) count++;
      }
      if (count === 5) return true;
    }
  }

  // Kiểm tra chéo phụ
  for (let row = 4; row < size; row++) {
    for (let col = 0; col <= size - 5; col++) {
      let count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[row - i][col + i] === player) count++;
      }
      if (count === 5) return true;
    }
  }

  return false;
}

// Minimax với Alpha-Beta Pruning
function minimax(board, size, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) {
  // Kiểm tra điều kiện dừng
  if (depth === 0) {
    return evaluateBoard(board, size, aiPlayer) - evaluateBoard(board, size, humanPlayer);
  }

  if (checkWin(board, size, aiPlayer)) return 100000 - depth;
  if (checkWin(board, size, humanPlayer)) return -100000 + depth;

  const moves = getPossibleMoves(board, size);
  if (moves.length === 0) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      board[move.row][move.col] = aiPlayer;
      const evaluation = minimax(board, size, depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
      board[move.row][move.col] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Alpha-Beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      board[move.row][move.col] = humanPlayer;
      const evaluation = minimax(board, size, depth - 1, alpha, beta, true, aiPlayer, humanPlayer);
      board[move.row][move.col] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha-Beta pruning
    }
    return minEval;
  }
}





// Tìm nước đi tốt nhất
function findBestMove(board, size, difficulty, aiPlayer, humanPlayer) {
  const moves = getPossibleMoves(board, size);
  
  if (moves.length === 0) return null;

  // Độ khó dễ: Random
  if (difficulty === 'easy') {
    // 70% random, 30% chặn hoặc tấn công đơn giản
    if (Math.random() < 0.7) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  // Độ khó trung bình: Minimax depth 2
  const depth = difficulty === 'medium' ? 2 : 4;

  let bestMove = null;
  let bestValue = -Infinity;

  for (const move of moves) {
    board[move.row][move.col] = aiPlayer;
    const moveValue = minimax(board, size, depth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
    board[move.row][move.col] = null;

    if (moveValue > bestValue) {
      bestValue = moveValue;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * 🎮 API: Tạo bàn cờ mới
 * POST /api/caro/new-game
 */
router.post('/new-game', (req, res) => {
  try {
    const { size = 15, mode = 'pvp', difficulty = 'medium' } = req.body;

    // Validate
    if (size < 10 || size > 20) {
      return res.status(400).json({ error: 'Kích thước bàn cờ từ 10-20' });
    }

    if (!['pvp', 'pve'].includes(mode)) {
      return res.status(400).json({ error: 'Mode phải là pvp hoặc pve' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty phải là easy, medium, hoặc hard' });
    }

    // Tạo bàn cờ trống
    const board = Array(size).fill(null).map(() => Array(size).fill(null));

    res.json({
      success: true,
      game: {
        board,
        size,
        mode,
        difficulty,
        currentPlayer: 'X',
        winner: null,
        gameOver: false,
      }
    });
  } catch (error) {
    console.error('Error creating new game:', error);
    res.status(500).json({ error: 'Không thể tạo game mới' });
  }
});

/**
 * 🤖 API: AI đánh nước đi tiếp theo
 * POST /api/caro/ai-move
 */
router.post('/ai-move', (req, res) => {
  try {
    const { board, size, difficulty, aiPlayer = 'O', humanPlayer = 'X' } = req.body;

    if (!board || !size) {
      return res.status(400).json({ error: 'Thiếu thông tin board hoặc size' });
    }

    const move = findBestMove(board, size, difficulty, aiPlayer, humanPlayer);

    if (!move) {
      return res.json({
        success: true,
        move: null,
        message: 'Không còn nước đi hợp lệ'
      });
    }

    res.json({
      success: true,
      move: {
        row: move.row,
        col: move.col,
        player: aiPlayer
      }
    });
  } catch (error) {
    console.error('Error finding AI move:', error);
    res.status(500).json({ error: 'Lỗi khi tính nước đi AI' });
  }
});

/**
 * ✅ API: Kiểm tra thắng thua
 * POST /api/caro/check-winner
 */
router.post('/check-winner', (req, res) => {
  try {
    const { board, size, lastMove } = req.body;

    if (!board || !size || !lastMove) {
      return res.status(400).json({ error: 'Thiếu thông tin' });
    }

    const { row, col, player } = lastMove;

    // Kiểm tra có 5 quân liên tiếp không
    const hasWon = checkWin(board, size, player);

    // Kiểm tra hòa (bàn cờ đầy)
    let isDraw = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === null) {
          isDraw = false;
          break;
        }
      }
      if (!isDraw) break;
    }

    res.json({
      success: true,
      winner: hasWon ? player : null,
      gameOver: hasWon || isDraw,
      isDraw: isDraw && !hasWon
    });
  } catch (error) {
    console.error('Error checking winner:', error);
    res.status(500).json({ error: 'Lỗi khi kiểm tra thắng thua' });
  }
});

/**
 * 💎 API: Tính điểm
 * POST /api/caro/calculate-score
 */
router.post('/calculate-score', (req, res) => {
  try {
    const { mode, difficulty, timeInSeconds, winner, totalMoves } = req.body;

    let baseScore = 0;

    // Điểm cơ bản theo độ khó (chỉ tính cho PVE)
    if (mode === 'pve') {
      const difficultyScores = {
        'easy': 1000,
        'medium': 2000,
        'hard': 4000
      };
      baseScore = difficultyScores[difficulty] || 1000;

      // Nếu thua thì 0 điểm
      if (winner !== 'X') {
        return res.json({ success: true, score: 0 });
      }
    } else {
      // PVP: Điểm cơ bản
      baseScore = 1500;
    }

    // Bonus theo thời gian (càng nhanh càng cao)
    const targetTime = mode === 'pve' ? 300 : 600; // 5 phút PVE, 10 phút PVP
    const timeDiff = targetTime - timeInSeconds;
    const timeBonus = Math.floor(timeDiff * 2);

    // Bonus theo số nước đi (càng ít càng tốt)
    const moveBonus = Math.max(0, (100 - totalMoves) * 10);

    const finalScore = Math.max(0, baseScore + timeBonus + moveBonus);

    res.json({
      success: true,
      score: finalScore,
      breakdown: {
        baseScore,
        timeBonus,
        moveBonus,
        finalScore
      }
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    res.status(500).json({ error: 'Lỗi khi tính điểm' });
  }
});

module.exports = router;