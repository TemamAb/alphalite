/**
 * Secure Key Handler
 * Provides encryption/decryption for sensitive data like private keys
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or derive from secret
 */
function getEncryptionKey() {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set for secure key storage');
    }
    
    // Use a fixed salt for consistent key derivation (in production, store salt per encrypted value)
    const salt = process.env.ENCRYPTION_SALT || 'alphapro-salt-v1';
    
    return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data
 * @param {string} plaintext - The data to encrypt
 * @returns {string} - Base64 encoded encrypted data (iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
    if (!plaintext) return null;
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Format: iv:authTag:ciphertext (all base64 encoded)
        return [
            iv.toString('hex'),
            authTag.toString('hex'),
            encrypted
        ].join(':');
    } catch (error) {
        console.error('[ENCRYPTION] Failed to encrypt:', error.message);
        throw error;
    }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - The encrypted data (iv:authTag:ciphertext format)
 * @returns {string} - Decrypted plaintext
 */
function decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const [ivHex, authTagHex, ciphertext] = parts;
        const key = getEncryptionKey();
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('[ENCRYPTION] Failed to decrypt:', error.message);
        throw error;
    }
}

/**
 * Hash sensitive data (one-way)
 * @param {string} data - The data to hash
 * @returns {string} - Hex encoded hash
 */
function hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Securely wipe sensitive data from memory
 * @param {Buffer} buffer - Buffer to wipe
 */
function secureWipe(buffer) {
    if (buffer) {
        crypto.randomFillSync(buffer);
        buffer.fill(0);
    }
}

/**
 * Validate that encryption is properly configured
 * @returns {object} - Status object
 */
function validateConfiguration() {
    const hasEncryptionKey = !!(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET);
    return {
        configured: hasEncryptionKey,
        warning: hasEncryptionKey ? null : 'Encryption key not set - using JWT_SECRET as fallback'
    };
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    secureWipe,
    validateConfiguration
};
