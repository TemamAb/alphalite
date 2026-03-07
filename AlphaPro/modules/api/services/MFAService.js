/**
 * Multi-Factor Authentication (MFA) Service
 * 
 * Implements TOTP-based two-factor authentication
 * Required for enterprise-grade security
 */

const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// Configure authenticator
authenticator.options = {
    window: 1 // Allow 1 step tolerance (30 seconds before/after)
};

class MFAService {
    constructor() {
        // In production, store in database
        this.mfaSecrets = new Map(); // userId -> { secret, enabled, backupCodes }
        this.pendingSetup = new Map(); // tempToken -> { userId, secret }
    }
    
    /**
     * Generate MFA setup for a user
     * Returns QR code URL and manual entry key
     */
    async generateSetup(userId, userEmail) {
        // Generate new secret
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(userEmail, 'AlphaPro', secret);
        
        // Generate QR code as data URL
        const qrCodeUrl = await QRCode.toDataURL(otpauth);
        
        // Generate backup codes (one-time use)
        const backupCodes = this.generateBackupCodes();
        
        // Store temporarily until confirmed
        const tempToken = crypto.randomBytes(32).toString('hex');
        this.pendingSetup.set(tempToken, {
            userId,
            secret,
            backupCodes: backupCodes.map(code => ({
                code,
                used: false
            })),
            expires: Date.now() + 300000 // 5 minutes
        });
        
        return {
            tempToken,
            secret, // For manual entry
            qrCodeUrl,
            backupCodes
        };
    }
    
    /**
     * Confirm MFA setup after user verifies code
     */
    async confirmSetup(tempToken, validToken) {
        const setup = this.pendingSetup.get(tempToken);
        
        if (!setup) {
            return { success: false, error: 'Invalid or expired setup token' };
        }
        
        if (Date.now() > setup.expires) {
            this.pendingSetup.delete(tempToken);
            return { success: false, error: 'Setup token expired' };
        }
        
        // Verify the TOTP token
        const isValid = authenticator.verify(validToken, setup.secret);
        
        if (!isValid) {
            return { success: false, error: 'Invalid verification code' };
        }
        
        // Move from pending to confirmed
        this.mfaSecrets.set(setup.userId, {
            secret: setup.secret,
            enabled: true,
            backupCodes: setup.backupCodes,
            createdAt: Date.now()
        });
        
        this.pendingSetup.delete(tempToken);
        
        return { success: true };
    }
    
    /**
     * Verify MFA token during login
     */
    async verify(userId, token) {
        const mfaData = this.mfaSecrets.get(userId);
        
        if (!mfaData || !mfaData.enabled) {
            // MFA not enabled for this user
            return { success: true, mfaRequired: false };
        }
        
        // Check backup codes first
        const backupCode = mfaData.backupCodes.find(
            bc => bc.code === token && !bc.used
        );
        
        if (backupCode) {
            // Mark backup code as used
            backupCode.used = true;
            this.mfaSecrets.set(userId, mfaData);
            
            return {
                success: true,
                mfaRequired: true,
                method: 'backup',
                remainingCodes: mfaData.backupCodes.filter(bc => !bc.used).length
            };
        }
        
        // Verify TOTP
        const isValid = authenticator.verify(token, mfaData.secret);
        
        if (!isValid) {
            return { success: false, error: 'Invalid MFA code' };
        }
        
        return { success: true, mfaRequired: true };
    }
    
    /**
     * Disable MFA for a user (requires current MFA code)
     */
    async disable(userId, token) {
        const mfaData = this.mfaSecrets.get(userId);
        
        if (!mfaData) {
            return { success: false, error: 'MFA not enabled' };
        }
        
        // Verify current token before disabling
        const isValid = authenticator.verify(token, mfaData.secret);
        
        if (!isValid) {
            return { success: false, error: 'Invalid MFA code' };
        }
        
        this.mfaSecrets.delete(userId);
        
        return { success: true };
    }
    
    /**
     * Get MFA status for a user
     */
    getStatus(userId) {
        const mfaData = this.mfaSecrets.get(userId);
        
        if (!mfaData || !mfaData.enabled) {
            return {
                enabled: false,
                backupCodesRemaining: 0
            };
        }
        
        return {
            enabled: true,
            backupCodesRemaining: mfaData.backupCodes.filter(bc => !bc.used).length,
            createdAt: mfaData.createdAt
        };
    }
    
    /**
     * Regenerate backup codes (requires valid MFA)
     */
    async regenerateBackupCodes(userId, token) {
        const mfaData = this.mfaSecrets.get(userId);
        
        if (!mfaData || !mfaData.enabled) {
            return { success: false, error: 'MFA not enabled' };
        }
        
        // Verify current token
        const isValid = authenticator.verify(token, mfaData.secret);
        
        if (!isValid) {
            return { success: false, error: 'Invalid MFA code' };
        }
        
        // Generate new backup codes
        const newBackupCodes = this.generateBackupCodes().map(code => ({
            code,
            used: false
        }));
        
        mfaData.backupCodes = newBackupCodes;
        this.mfaSecrets.set(userId, mfaData);
        
        return {
            success: true,
            backupCodes: newBackupCodes.map(bc => bc.code)
        };
    }
    
    /**
     * Generate secure backup codes
     */
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
    
    /**
     * Cleanup expired pending setups
     */
    cleanup() {
        const now = Date.now();
        for (const [token, setup] of this.pendingSetup.entries()) {
            if (now > setup.expires) {
                this.pendingSetup.delete(token);
            }
        }
    }
}

module.exports = new MFAService();
