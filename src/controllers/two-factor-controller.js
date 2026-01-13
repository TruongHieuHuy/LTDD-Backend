
const { prisma } = require('../config/database');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

/**
 * Controller for Two-Factor Authentication (2FA)
 */
class TwoFactorController {

    /**
     * Enable 2FA for the current user
     * Generates a secret and returns the QR code URI
     */
    async enable2FA(req, res) {
        try {
            const userId = req.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Generate a secret
            const secret = authenticator.generateSecret();

            // Save the secret temporarily or permanently? 
            // Ideally, we verify it first before saving it as "enabled".
            // But for simplicity, we can save it now but keep isTwoFactorEnabled = false
            // until they verify.

            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorSecret: secret }
            });

            // Generate otpauth URL
            const otpauth = authenticator.keyuri(user.email, 'MiniGameCenter', secret);

            // Generate QR code data URL
            const qrCodeUrl = await qrcode.toDataURL(otpauth);

            return res.status(200).json({
                secret,
                qrCodeUrl,
                otpauth
            });

        } catch (error) {
            console.error('Error enabling 2FA:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * Verify 2FA token to complete setup
     */
    async verify2FA(req, res) {
        try {
            const { code } = req.body;
            const userId = req.userId;

            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user || !user.twoFactorSecret) {
                return res.status(400).json({ message: '2FA setup not initiated' });
            }

            const isValid = authenticator.verify({
                token: code,
                secret: user.twoFactorSecret
            });

            if (!isValid) {
                return res.status(400).json({ message: 'Invalid verification code' });
            }

            // Enable 2FA
            await prisma.user.update({
                where: { id: userId },
                data: { isTwoFactorEnabled: true }
            });

            return res.status(200).json({ message: '2FA enabled successfully' });

        } catch (error) {
            console.error('Error verifying 2FA:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    /**
     * Disable 2FA
     */
    async disable2FA(req, res) {
        try {
            const userId = req.userId;

            await prisma.user.update({
                where: { id: userId },
                data: {
                    isTwoFactorEnabled: false,
                    twoFactorSecret: null
                }
            });

            return res.status(200).json({ message: '2FA disabled successfully' });

        } catch (error) {
            console.error('Error disabling 2FA:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new TwoFactorController();
