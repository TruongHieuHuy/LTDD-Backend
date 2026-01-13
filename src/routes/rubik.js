// Backend/src/routes/rubik.js
const express = require('express');
const router = express.Router();

/**
 * 🎮 API: Tạo Rubik Cube mới
 * POST /api/rubik/new-game
 */
router.post('/new-game', (req, res) => {
    try {
        const { size = 3 } = req.body;

        // Validate
        if (![2, 3, 4].includes(size)) {
            return res.status(400).json({ error: 'Rubik cube size phải là 2, 3, hoặc 4' });
        }

        // Tạo Rubik cube đã hoàn thành (solved state)
        // Mỗi mặt có 1 màu riêng: White, Yellow, Red, Orange, Green, Blue
        const faces = {
            front: Array(size * size).fill('W'),  // White
            back: Array(size * size).fill('Y'),   // Yellow  
            left: Array(size * size).fill('R'),   // Red
            right: Array(size * size).fill('O'),  // Orange
            top: Array(size * size).fill('G'),    // Green
            bottom: Array(size * size).fill('B')  // Blue
        };

        res.json({
            success: true,
            game: {
                cube: faces,
                size,
                moves: [],
                solved: true,
                gameOver: false
            }
        });
    } catch (error) {
        console.error('Error creating new Rubik cube:', error);
        res.status(500).json({ error: 'Không thể tạo Rubik cube mới' });
    }
});

/**
 * 🔄 API: Xáo trộn Rubik cube
 * POST /api/rubik/shuffle
 */
router.post('/shuffle', (req, res) => {
    try {
        const { size = 3, numMoves = 20 } = req.body;

        if (![2, 3, 4].includes(size)) {
            return res.status(400).json({ error: 'Size phải là 2, 3, hoặc 4' });
        }

        // Danh sách các nước đi có thể: F, B, L, R, U, D (và các biến thể)
        const possibleMoves = ['F', 'B', 'L', 'R', 'U', 'D', "F'", "B'", "L'", "R'", "U'", "D'"];
        const shuffleMoves = [];

        for (let i = 0; i < numMoves; i++) {
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            shuffleMoves.push(randomMove);
        }

        res.json({
            success: true,
            moves: shuffleMoves,
            message: `Đã tạo ${numMoves} nước đi xáo trộn`
        });
    } catch (error) {
        console.error('Error shuffling cube:', error);
        res.status(500).json({ error: 'Lỗi khi xáo trộn cube' });
    }
});

/**
 * ✅ API: Kiểm tra Rubik cube đã hoàn thành chưa
 * POST /api/rubik/check-solved
 */
router.post('/check-solved', (req, res) => {
    try {
        const { cube, size } = req.body;

        if (!cube || !size) {
            return res.status(400).json({ error: 'Thiếu thông tin cube hoặc size' });
        }

        // Kiểm tra mỗi mặt có cùng màu hay không
        const isSolved = Object.values(cube).every(face => {
            const firstColor = face[0];
            return face.every(cell => cell === firstColor);
        });

        res.json({
            success: true,
            solved: isSolved,
            gameOver: isSolved
        });
    } catch (error) {
        console.error('Error checking solved status:', error);
        res.status(500).json({ error: 'Lỗi khi kiểm tra trạng thái cube' });
    }
});

/**
 * 💡 API: Lấy gợi ý nước đi tiếp theo
 * POST /api/rubik/get-hint
 */
router.post('/get-hint', (req, res) => {
    try {
        const { cube, size, moves = [] } = req.body;

        if (!cube || !size) {
            return res.status(400).json({ error: 'Thiếu thông tin cube hoặc size' });
        }

        // Simple hint: đề xuất các nước đi cơ bản
        const basicMoves = ['F', 'R', 'U'];
        const hint = basicMoves[Math.floor(Math.random() * basicMoves.length)];

        res.json({
            success: true,
            hint: {
                move: hint,
                description: `Thử xoay mặt ${hint}`
            }
        });
    } catch (error) {
        console.error('Error getting hint:', error);
        res.status(500).json({ error: 'Lỗi khi lấy gợi ý' });
    }
});

/**
 * 💎 API: Tính điểm
 * POST /api/rubik/calculate-score
 */
router.post('/calculate-score', (req, res) => {
    try {
        const { size, timeInSeconds, totalMoves, solved } = req.body;

        if (!solved) {
            return res.json({
                success: true,
                score: 0,
                message: 'Chưa hoàn thành cube'
            });
        }

        // Điểm cơ bản theo kích thước
        const sizeScores = {
            2: 1000,
            3: 2000,
            4: 4000
        };
        const baseScore = sizeScores[size] || 1000;

        // Bonus theo thời gian (càng nhanh càng cao)
        const targetTime = size * 120; // 2 phút/size
        const timeDiff = targetTime - timeInSeconds;
        const timeBonus = Math.max(0, Math.floor(timeDiff * 5));

        // Bonus theo số nước đi (càng ít càng tốt)
        const targetMoves = size * 30; // Số nước đi lý tưởng
        const moveBonus = Math.max(0, (targetMoves - totalMoves) * 20);

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

/**
 * 🔍 API: Validate một nước đi
 * POST /api/rubik/validate-move
 */
router.post('/validate-move', (req, res) => {
    try {
        const { move } = req.body;

        if (!move) {
            return res.status(400).json({ error: 'Thiếu thông tin nước đi' });
        }

        // Danh sách nước đi hợp lệ
        const validMoves = [
            'F', 'B', 'L', 'R', 'U', 'D',
            "F'", "B'", "L'", "R'", "U'", "D'",
            'F2', 'B2', 'L2', 'R2', 'U2', 'D2'
        ];

        const isValid = validMoves.includes(move);

        res.json({
            success: true,
            valid: isValid,
            move
        });
    } catch (error) {
        console.error('Error validating move:', error);
        res.status(500).json({ error: 'Lỗi khi validate nước đi' });
    }
});

module.exports = router;
