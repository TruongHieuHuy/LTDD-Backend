// Backend/src/routes/puzzle.js

const express = require('express');
const router = express.Router();
const sharp = require('sharp'); // For image processing
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Thư mục lưu ảnh tạm
const UPLOAD_DIR = path.join(__dirname, '../../uploads/puzzle');

// Tạo thư mục nếu chưa có
(async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('✅ Upload directory created:', UPLOAD_DIR);
  } catch (err) {
    console.error('❌ Error creating upload directory:', err);
  }
})();

/**
 * POST /puzzle/generate
 * Generate a puzzle game
 */
router.post('/generate', async (req, res) => {
  try {
    const { difficulty, gridSize } = req.body;

    if (!difficulty || !gridSize) {
      return res.status(400).json({ error: 'Missing difficulty or gridSize' });
    }

    // Validate gridSize
    if (![3, 4, 5].includes(gridSize)) {
      return res.status(400).json({ error: 'Invalid gridSize. Must be 3, 4, or 5' });
    }

    // Get random image from Unsplash/Picsum
    const imageUrl = `https://picsum.photos/800/800?random=${Date.now()}`;
    
    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Generate unique game ID
    const gameId = uuidv4();
    const gameDir = path.join(UPLOAD_DIR, gameId);
    await fs.mkdir(gameDir, { recursive: true });

    // Save original image
    const originalPath = path.join(gameDir, 'original.jpg');
    await fs.writeFile(originalPath, imageBuffer);

    // Cut image into tiles
    const tilePaths = await cutImageIntoTiles(imageBuffer, gridSize, gameDir);

    // Generate solvable puzzle state
    const tiles = generateSolvablePuzzle(gridSize);

    // Get base URL for images
    // Ưu tiên dùng IP từ request header, fallback về localhost
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    console.log('📍 Base URL for images:', baseUrl);


const puzzle = {
    id: gameId,
    difficulty,
    gridSize,
    tiles, 
    imageUrl: `${baseUrl}/uploads/puzzle/${gameId}/original.jpg`,
    
    tilePaths: Array.from({ length: gridSize * gridSize }).map((_, i) => {
      if (i === 0) return ""; 
      return `${baseUrl}/uploads/puzzle/${gameId}/tile_${i}.jpg`; 
    }),
    
    moves: 0,
    startTime: new Date().toISOString(),
  };

    console.log('✅ Generated puzzle with imageUrl:', puzzle.imageUrl);

    res.json({ puzzle });
  } catch (error) {
    console.error('Error generating puzzle:', error);
    res.status(500).json({ error: 'Failed to generate puzzle', details: error.message });
  }
});

/**
 * POST /puzzle/calculate-score
 * Calculate puzzle score
 */
router.post('/calculate-score', (req, res) => {
  try {
    const { difficulty, timeInSeconds, moves, gridSize } = req.body;

    if (!difficulty || timeInSeconds === undefined || moves === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Base scores
    const baseScores = { easy: 1500, medium: 3000, hard: 5000 };
    const targetTimes = { easy: 120, medium: 300, hard: 600 };
    const targetMoves = { easy: 50, medium: 100, hard: 200 };

    const baseScore = baseScores[difficulty.toLowerCase()] || 1500;
    const targetTime = targetTimes[difficulty.toLowerCase()] || 120;
    const targetMove = targetMoves[difficulty.toLowerCase()] || 50;

    // Time bonus/penalty
    const timeDiff = targetTime - timeInSeconds;
    const maxTimeBonus = Math.floor(baseScore * 0.3);
    const timeBonus = Math.max(-maxTimeBonus, Math.min(maxTimeBonus, timeDiff * 5));

    // Move penalty
    const moveDiff = moves - targetMove;
    const movePenalty = moveDiff > 0 ? moveDiff * 10 : 0;

    // Final score
    const finalScore = Math.max(0, Math.min(99999, baseScore + timeBonus - movePenalty));

    res.json({ score: Math.floor(finalScore) });
  } catch (error) {
    console.error('Error calculating score:', error);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
});

/**
 * Helper: Cut image into tiles
 */
async function cutImageIntoTiles(imageBuffer, gridSize, outputDir) {
    const baseSize = 1200; 
    const tileSize = baseSize / gridSize;
    const baseImage = await sharp(imageBuffer)
      .resize(baseSize, baseSize, { fit: 'cover', position: 'center' })
      .toBuffer();
  
    const tilePromises = [];
  
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const index = row * gridSize + col;
        
        if (index === 0) continue; 
  
        const tilePath = path.join(outputDir, `tile_${index}.jpg`);
        const promise = sharp(baseImage)
          .extract({
            left: Math.round(col * tileSize),
            top: Math.round(row * tileSize),
            width: Math.round(tileSize),
            height: Math.round(tileSize),
          })
          .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
          .toFile(tilePath)
          .then(() => tilePath);
  
        tilePromises.push(promise);
      }
    }
  
    await Promise.all(tilePromises);
    
    // QUAN TRỌNG: Tạo mảng trả về có đúng 9 phần tử cho 3x3
    // Index 0 sẽ để trống, index 1-8 sẽ là link ảnh
    const finalPaths = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      if (i === 0) {
        finalPaths.push(""); // Ô trống
      } else {
        finalPaths.push(path.join(outputDir, `tile_${i}.jpg`));
      }
    }
    return finalPaths;
  }

/**
 * Helper: Generate solvable puzzle
 * Thuật toán đảm bảo puzzle có thể giải được
 */
function generateSolvablePuzzle(gridSize) {
  const totalTiles = gridSize * gridSize;
  const tiles = [];

  // Initialize tiles in correct position
  for (let i = 0; i < totalTiles; i++) {
    tiles.push({
      value: i,
      currentIndex: i,
      correctIndex: i,
    });
  }

  // Shuffle with valid moves (swap with empty tile)
  let emptyIndex = totalTiles - 1;
  const numShuffles = gridSize * gridSize * 20; // Nhiều bước để shuffle tốt

  for (let i = 0; i < numShuffles; i++) {
    const neighbors = getValidNeighbors(emptyIndex, gridSize);
    const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

    // Swap
    [tiles[emptyIndex], tiles[randomNeighbor]] = [tiles[randomNeighbor], tiles[emptyIndex]];
    
    // Update current indices
    tiles[emptyIndex].currentIndex = emptyIndex;
    tiles[randomNeighbor].currentIndex = randomNeighbor;

    emptyIndex = randomNeighbor;
  }

  return tiles;
}

/**
 * Helper: Get valid neighbors for a position
 */
function getValidNeighbors(index, gridSize) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const neighbors = [];

  // Up
  if (row > 0) neighbors.push(index - gridSize);
  // Down
  if (row < gridSize - 1) neighbors.push(index + gridSize);
  // Left
  if (col > 0) neighbors.push(index - 1);
  // Right
  if (col < gridSize - 1) neighbors.push(index + 1);

  return neighbors;
}

module.exports = router;