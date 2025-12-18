/**
 * Posts Routes
 * Social media posts with like, comment, share features
 */
const express = require('express');
const router = express.Router();
const { PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== CREATE POST ====================
/**
 * POST /api/posts
 * Create a new post
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, imageUrl, visibility = 'public', category } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate category if provided (must match GameType enum in schema)
    const validCategories = ['rubik', 'sudoku', 'puzzle', 'caro'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be one of: rubik, sudoku, puzzle, caro' });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        imageUrl,
        visibility,
        category: category || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ==================== GET POSTS FEED ====================
/**
 * GET /api/posts
 * Get posts feed (all public posts + friends' posts)
 * Query params: limit, offset, userId, category, search (username or content)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, userId: filterUserId, category, search } = req.query;

    // Build where clause
    let where = {};

    // Filter by specific user
    if (filterUserId) {
      where.userId = filterUserId;
    } else {
      // Visibility filter
      where.OR = [
        { visibility: 'public' },
        { userId }, // Own posts
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Search by username or content
    if (search) {
      const searchWhere = {
        OR: [
          { content: { contains: search, mode: 'insensitive' } },
          { user: { username: { contains: search, mode: 'insensitive' } } },
        ],
      };
      where = { AND: [where, searchWhere] };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Check if current user liked each post
    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post) => {
        const userLike = await prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId,
            },
          },
        });

        return {
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          isLiked: !!userLike,
          _count: undefined,
        };
      })
    );

    res.json({ posts: postsWithLikeStatus });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// ==================== GET SINGLE POST ====================
/**
 * GET /api/posts/:postId
 * Get a single post with comments
 */
router.get('/:postId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user liked
    const userLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    res.json({
      ...post,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isLiked: !!userLike,
      _count: undefined,
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// ==================== UPDATE POST ====================
/**
 * PUT /api/posts/:postId
 * Update a post (only owner)
 */
router.put('/:postId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content, imageUrl, visibility, category } = req.body;

    // Check ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // Validate category if provided
    if (category !== undefined && category !== null) {
      const validCategories = ['rubik', 'sudoku', 'puzzle', 'caro'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          error: 'Invalid category. Must be one of: rubik, sudoku, puzzle, caro' 
        });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content || post.content,
        imageUrl: imageUrl !== undefined ? imageUrl : post.imageUrl,
        visibility: visibility || post.visibility,
        category: category !== undefined ? category : post.category,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// ==================== DELETE POST ====================
/**
 * DELETE /api/posts/:postId
 * Delete a post (only owner)
 */
router.delete('/:postId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ==================== LIKE POST ====================
/**
 * POST /api/posts/:postId/like
 * Toggle like on a post
 */
router.post('/:postId/like', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      // Decrement count
      await prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });

      res.json({ liked: false, message: 'Post unliked' });
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      // Increment count
      await prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      res.json({ liked: true, message: 'Post liked' });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// ==================== ADD COMMENT ====================
/**
 * POST /api/posts/:postId/comments
 * Add a comment to a post
 */
router.post('/:postId/comments', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Increment comment count
    await prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ==================== SAVE POST ====================
/**
 * POST /api/posts/:postId/save
 * Toggle save post to favorites
 */
router.post('/:postId/save', async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const existingSave = await prisma.savedPost.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingSave) {
      // Unsave
      await prisma.savedPost.delete({
        where: { id: existingSave.id },
      });
      res.json({ saved: false, message: 'Post removed from saved' });
    } else {
      // Save
      await prisma.savedPost.create({
        data: {
          postId,
          userId,
        },
      });
      res.json({ saved: true, message: 'Post saved to favorites' });
    }
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// ==================== GET SAVED POSTS ====================
/**
 * GET /api/posts/saved/list
 * Get user's saved posts
 */
router.get('/saved/list', async (req, res) => {
  try {
    const userId = req.user.id;

    const savedPosts = await prisma.savedPost.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    });

    const posts = savedPosts.map((saved) => ({
      ...saved.post,
      likeCount: saved.post._count.likes,
      commentCount: saved.post._count.comments,
      _count: undefined,
    }));

    res.json({ posts });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
});

// ==================== FOLLOW USER ====================
/**
 * POST /api/posts/follow/:targetUserId
 * Toggle follow a user
 */
router.post('/follow/:targetUserId', async (req, res) => {
  try {
    const followerId = req.user.id;
    const { targetUserId } = req.params;

    if (followerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      res.json({ following: false, message: 'Unfollowed user' });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId,
          followingId: targetUserId,
        },
      });
      res.json({ following: true, message: 'Followed user' });
    }
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

module.exports = router;
