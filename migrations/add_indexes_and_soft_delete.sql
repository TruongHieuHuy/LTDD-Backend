-- Migration: Add performance indexes and soft delete
-- Run this after backing up your database

-- Add soft delete columns to User table
ALTER TABLE users 
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP;

-- Add performance indexes for User table
CREATE INDEX idx_users_deleted_score ON users("isDeleted", "totalScore" DESC);
CREATE INDEX idx_users_email_password ON users("email", "password");
CREATE INDEX idx_users_created_at ON users("createdAt" DESC);

-- Add check constraint for GameScore
ALTER TABLE game_scores
ADD CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 999999);

-- Add composite indexes for better query performance
CREATE INDEX idx_game_scores_user_type_created ON game_scores("userId", "gameType", "createdAt" DESC);
CREATE INDEX idx_game_scores_type_score ON game_scores("gameType", "score" DESC);
CREATE INDEX idx_game_scores_difficulty ON game_scores("difficulty");

-- Add indexes for Friend system
CREATE INDEX idx_friendships_blocked ON friendships("isBlocked");
CREATE INDEX idx_friend_requests_receiver_status ON friend_requests("receiverId", "status");
CREATE INDEX idx_friend_requests_sender ON friend_requests("senderId");

-- Add indexes for Messages
CREATE INDEX idx_messages_sender_receiver_sent ON messages("senderId", "receiverId", "sentAt" DESC);
CREATE INDEX idx_messages_receiver_unread ON messages("receiverId", "isRead");
CREATE INDEX idx_messages_chat_room ON messages("senderId", "receiverId");

-- Add indexes for Posts
CREATE INDEX idx_posts_user_created ON posts("userId", "createdAt" DESC);
CREATE INDEX idx_posts_category_created ON posts("category", "createdAt" DESC);
CREATE INDEX idx_posts_visibility ON posts("visibility");

-- Add indexes for Likes
CREATE INDEX idx_likes_post_user ON likes("postId", "userId");
CREATE INDEX idx_likes_user_created ON likes("userId", "createdAt" DESC);

-- Add indexes for Comments
CREATE INDEX idx_comments_post_created ON comments("postId", "createdAt" DESC);
CREATE INDEX idx_comments_user ON comments("userId");

-- Add indexes for Achievements
CREATE INDEX idx_achievements_category_order ON achievements("category", "order");
CREATE INDEX idx_user_achievements_user_unlocked ON user_achievements("userId", "isUnlocked");
CREATE INDEX idx_user_achievements_user_progress ON user_achievements("userId", "progress");

-- Add indexes for Follows
CREATE INDEX idx_follows_follower ON follows("followerId");
CREATE INDEX idx_follows_following ON follows("followingId");
CREATE INDEX idx_follows_follower_following ON follows("followerId", "followingId");

-- Add performance statistics
CREATE STATISTICS stat_game_scores_type_difficulty ON "gameType", "difficulty" FROM game_scores;
CREATE STATISTICS stat_posts_user_category ON "userId", "category" FROM posts;

-- Analyze tables for query optimization
ANALYZE users;
ANALYZE game_scores;
ANALYZE friendships;
ANALYZE friend_requests;
ANALYZE messages;
ANALYZE posts;
ANALYZE comments;
ANALYZE likes;
ANALYZE achievements;
ANALYZE user_achievements;
ANALYZE follows;
