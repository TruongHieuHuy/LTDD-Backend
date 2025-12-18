/**
 * Script tạo friendships giữa 3 test users
 * Run: node scripts/create-test-friendships.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking existing users...');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true },
  });

  if (users.length < 2) {
    console.log('❌ Need at least 2 users. Current users:', users.length);
    return;
  }

  console.log(`✅ Found ${users.length} users:`);
  users.forEach((u) => console.log(`  - ${u.username} (${u.email})`));

  // Check existing friendships
  const existingFriendships = await prisma.friendship.findMany({
    include: {
      user1: { select: { username: true } },
      user2: { select: { username: true } },
    },
  });

  console.log(`\n📊 Existing friendships: ${existingFriendships.length}`);
  existingFriendships.forEach((f) => {
    console.log(`  - ${f.user1.username} ↔ ${f.user2.username}`);
  });

  // Create friendships between all users (if not exists)
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];

      // Sort IDs (smaller first)
      const [userId1, userId2] =
        user1.id < user2.id ? [user1.id, user2.id] : [user2.id, user1.id];

      // Check if friendship exists
      const exists = await prisma.friendship.findUnique({
        where: {
          userId1_userId2: {
            userId1,
            userId2,
          },
        },
      });

      if (exists) {
        console.log(
          `⏭️  Skipping ${user1.username} ↔ ${user2.username} (already friends)`,
        );
        skipped++;
        continue;
      }

      // Create friendship
      await prisma.friendship.create({
        data: {
          userId1,
          userId2,
        },
      });

      console.log(`✅ Created friendship: ${user1.username} ↔ ${user2.username}`);
      created++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  - Created: ${created} friendships`);
  console.log(`  - Skipped: ${skipped} (already exist)`);
  console.log(`  - Total: ${created + skipped} friendships`);

  // Verify final state
  const finalFriendships = await prisma.friendship.count();
  console.log(`\n✅ Total friendships in database: ${finalFriendships}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
