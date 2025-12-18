-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "category" "GameType";

-- CreateIndex
CREATE INDEX "posts_category_createdAt_idx" ON "posts"("category", "createdAt" DESC);
