-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('rubik', 'sudoku', 'caro', 'puzzle');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard', 'expert');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatarUrl" VARCHAR(500),
    "totalGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "score" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "Difficulty" NOT NULL,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "gameData" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "game_scores_userId_gameType_createdAt_idx" ON "game_scores"("userId", "gameType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "game_scores_gameType_score_idx" ON "game_scores"("gameType", "score" DESC);

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
