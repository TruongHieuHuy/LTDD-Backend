-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "opponentId" TEXT,
    "betAmount" INTEGER NOT NULL DEFAULT 100,
    "totalGames" INTEGER NOT NULL DEFAULT 3,
    "currentGame" INTEGER NOT NULL DEFAULT 1,
    "gamesCompleted" INTEGER NOT NULL DEFAULT 0,
    "game1Type" TEXT,
    "game1CreatorVote" TEXT,
    "game1OpponentVote" TEXT,
    "game2Type" TEXT,
    "game2CreatorVote" TEXT,
    "game2OpponentVote" TEXT,
    "game3Type" TEXT,
    "game3CreatorVote" TEXT,
    "game3OpponentVote" TEXT,
    "game1CreatorScore" INTEGER NOT NULL DEFAULT 0,
    "game1OpponentScore" INTEGER NOT NULL DEFAULT 0,
    "game1Completed" BOOLEAN NOT NULL DEFAULT false,
    "game2CreatorScore" INTEGER NOT NULL DEFAULT 0,
    "game2OpponentScore" INTEGER NOT NULL DEFAULT 0,
    "game2Completed" BOOLEAN NOT NULL DEFAULT false,
    "game3CreatorScore" INTEGER NOT NULL DEFAULT 0,
    "game3OpponentScore" INTEGER NOT NULL DEFAULT 0,
    "game3Completed" BOOLEAN NOT NULL DEFAULT false,
    "creatorWins" INTEGER NOT NULL DEFAULT 0,
    "opponentWins" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "creatorForfeit" BOOLEAN NOT NULL DEFAULT false,
    "opponentForfeit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenges_creatorId_status_idx" ON "challenges"("creatorId", "status");

-- CreateIndex
CREATE INDEX "challenges_opponentId_status_idx" ON "challenges"("opponentId", "status");

-- CreateIndex
CREATE INDEX "challenges_status_expiresAt_idx" ON "challenges"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "challenges_createdAt_idx" ON "challenges"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
