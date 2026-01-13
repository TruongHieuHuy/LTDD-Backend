// Reset 2FA for a user
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset2FA() {
    try {
        const email = 'admin@gmail.com'; // Change this to your email

        console.log(`🔄 Resetting 2FA for ${email}...`);

        const user = await prisma.user.update({
            where: { email },
            data: {
                isTwoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });

        console.log('✅ 2FA has been reset successfully!');
        console.log(`User: ${user.username} (${user.email})`);
        console.log('You can now login without 2FA code.');
        console.log('\n📝 To re-enable 2FA:');
        console.log('1. Login to the app');
        console.log('2. Go to Settings > Security');
        console.log('3. Enable 2FA and scan the new QR code');

    } catch (error) {
        console.error('❌ Error resetting 2FA:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

reset2FA();
