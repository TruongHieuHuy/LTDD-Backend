-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GameType" ADD VALUE 'guess_number';
ALTER TYPE "GameType" ADD VALUE 'cows_bulls';
ALTER TYPE "GameType" ADD VALUE 'memory_match';
ALTER TYPE "GameType" ADD VALUE 'quick_math';
