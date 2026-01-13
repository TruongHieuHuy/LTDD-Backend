const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../middleware/error-handler');
const validator = require('validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// ==================== AVATAR UPLOAD CONFIGURATION ====================
const avatarStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `avatar-${req.user.id}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB for avatars
        files: 1
    },
    fileFilter: (req, file, cb) => {
        console.log('Avatar upload fileFilter:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            fieldname: file.fieldname
        });

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const allowedExtensions = /\.(jpg|jpeg|png)$/i;
        
        const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
        const hasValidExtension = allowedExtensions.test(file.originalname);

        if (hasValidExtension && hasValidMimeType) {
            cb(null, true);
        } else {
            console.error('Avatar rejected:', {
                hasValidExtension,
                hasValidMimeType,
                mimetype: file.mimetype,
                filename: file.originalname
            });
            cb(new Error('Only JPEG and PNG images are allowed for avatars'));
        }
    }
});

// ==================== UPDATE PROFILE (USERNAME, EMAIL) ====================
/**
 * PUT /api/users/profile
 * Update user profile information
 */
router.put('/profile', authenticateToken, async (req, res, next) => {
    try {
        const { username, email } = req.body;
        const updateData = {};

        // Validate and update username
        if (username !== undefined) {
            if (username.length < 3 || username.length > 20) {
                throw new ValidationError('Username must be between 3 and 20 characters');
            }

            // Check username uniqueness
            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    id: { not: req.user.id }
                }
            });

            if (existingUser) {
                throw new ValidationError('Username already taken');
            }

            updateData.username = validator.escape(username.trim());
        }

        // Validate and update email
        if (email !== undefined) {
            if (!validator.isEmail(email)) {
                throw new ValidationError('Invalid email format');
            }

            // Check email uniqueness
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    id: { not: req.user.id }
                }
            });

            if (existingUser) {
                throw new ValidationError('Email already in use');
            }

            updateData.email = email.toLowerCase();
        }

        // If no data to update
        if (Object.keys(updateData).length === 0) {
            throw new ValidationError('No valid fields to update');
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                role: true,
                totalScore: true,
                totalGamesPlayed: true,
                createdAt: true
            }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
});

// ==================== UPDATE AVATAR ====================
/**
 * PUT /api/users/avatar
 * Upload and update user avatar
 */
router.put('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ValidationError('No avatar file provided');
        }

        // Get current user to delete old avatar
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { avatarUrl: true }
        });

        // Delete old avatar if exists
        if (currentUser?.avatarUrl) {
            const oldAvatarPath = path.join(__dirname, '../..', currentUser.avatarUrl);
            await fs.unlink(oldAvatarPath).catch(() => {
                // Ignore error if file doesn't exist
            });
        }

        // Update avatar URL in database
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl },
            select: {
                id: true,
                username: true,
                avatarUrl: true
            }
        });

        res.json({
            success: true,
            message: 'Avatar updated successfully',
            data: {
                avatarUrl: updatedUser.avatarUrl,
                user: updatedUser
            }
        });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        next(error);
    }
});

// ==================== SEARCH USERS ====================
/**
 * GET /api/users/search
 * Search users by username or email
 */
router.get('/search', authenticateToken, async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json({ success: true, data: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ],
                NOT: {
                    id: req.user.id // Exclude self
                }
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                totalScore: true
            },
            take: 20
        });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET USER BY ID ====================
/**
 * GET /api/users/:userId
 * Get user profile by ID (public info)
 */
router.get('/:userId', authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                role: true,
                totalScore: true,
                totalGamesPlayed: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

// ==================== GET CURRENT USER ====================
/**
 * GET /api/users/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                role: true,
                totalScore: true,
                totalGamesPlayed: true,
                createdAt: true,
                lastLoginAt: true
            }
        });

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
