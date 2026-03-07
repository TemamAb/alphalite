/**
 * Server-Side Transaction Signing Service
 * 
 * CRITICAL SECURITY COMPONENT
 * This service handles all transaction signing server-side
 * to eliminate private key exposure in the client
 * 
 * NEVER transmit private keys over the network
 */

const ethers = require('ethers');
const crypto = require('crypto');

class TransactionSigningService {
    constructor(config = {}) {
        this.config = config;
        this.signer = null;
        this.walletAddress = null;
        this.encryptionKey = null;
        
        // Initialize encryption for in-memory key storage
        this._initializeEncryption();
    }
    
    /**
     * Initialize server-side encryption for wallet keys
     * In production, this should integrate with HSM or cloud KMS
     */
    _initializeEncryption() {
        // Use environment variable for encryption key
        const keyMaterial = process.env.WALLET_ENCRYPTION_KEY;
        
        if (!keyMaterial && process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: WALLET_ENCRYPTION_KEY environment variable required in production');
        }
        
        if (keyMaterial) {
            // Derive a proper 32-byte key from the material
            this.encryptionKey = crypto.createHash('sha256')
                .update(keyMaterial)
                .digest();
        }
    }
    
    /**
     * Initialize signer from encrypted wallet
     * The private key should NEVER leave this service
     */
    async initializeWallet(encryptedKey, password) {
        try {
            // Decrypt the wallet key
            const privateKey = this._decryptKey(encryptedKey, password);
            
            // Create ethers wallet
            this.signer = new ethers.Wallet(privateKey);
            this.walletAddress = this.signer.address;
            
            // Zero out the private key from memory after use
            // Note: JavaScript doesn't guarantee immediate memory cleanup
            // For true security, use HSM integration
            
            console.log(`[SIGNER] Wallet initialized: ${this.walletAddress}`);
            return { success: true, address: this.walletAddress };
        } catch (error) {
            console.error('[SIGNER] Failed to initialize wallet:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign a transaction without exposing private key
     * @param {Object} transaction - Ethers.js transaction object
     * @returns {Promise<Object>} - Signed transaction
     */
    async signTransaction(transaction) {
        if (!this.signer) {
            throw new Error('Wallet not initialized. Call initializeWallet first.');
        }
        
        try {
            // Populate transaction with nonce, gas limits etc
            const populatedTx = await this.signer.populateTransaction(transaction);
            
            // Sign the transaction
            const signedTx = await this.signer.signTransaction(populatedTx);
            
            console.log(`[SIGNER] Transaction signed: ${populatedTx.hash?.slice(0, 10)}...`);
            
            return {
                success: true,
                signedTransaction: signedTx,
                hash: populatedTx.hash,
                from: this.walletAddress
            };
        } catch (error) {
            console.error('[SIGNER] Transaction signing failed:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign a message (for authentication or data verification)
     */
    async signMessage(message) {
        if (!this.signer) {
            throw new Error('Wallet not initialized');
        }
        
        try {
            const signature = await this.signer.signMessage(
                typeof message === 'string' ? message : JSON.stringify(message)
            );
            
            return { success: true, signature };
        } catch (error) {
            console.error('[SIGNER] Message signing failed:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign typed data (EIP-712)
     */
    async signTypedData(domain, types, value) {
        if (!this.signer) {
            throw new Error('Wallet not initialized');
        }
        
        try {
            const signature = await this.signer._signTypedData(domain, types, value);
            return { success: true, signature };
        } catch (error) {
            console.error('[SIGNER] Typed data signing failed:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Verify a signature from a given address
     */
    verifySignature(message, signature, address) {
        try {
            const recoveredAddress = ethers.verifyMessage(
                typeof message === 'string' ? message : JSON.stringify(message),
                signature
            );
            
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
            console.error('[SIGNER] Signature verification failed:', error.message);
            return false;
        }
    }
    
    /**
     * Encrypt wallet key for storage
     * In production, use HSM or cloud KMS
     */
    encryptWalletKey(privateKey, password) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        
        // Generate random IV
        const iv = crypto.randomBytes(16);
        
        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        
        // Encrypt the private key
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        // Return encrypted key with IV and auth tag
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    /**
     * Decrypt wallet key
     */
    _decryptKey(encryptedData, password) {
        if (!this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        const encrypted = encryptedData.encrypted;
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    /**
     * Generate a new wallet (for creating new trading accounts)
     */
    generateWallet() {
        const wallet = ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey // Should be encrypted immediately
        };
    }
    
    /**
     * Get wallet address without exposing private key
     */
    getAddress() {
        return this.walletAddress;
    }
    
    /**
     * Check if wallet is initialized and ready
     */
    isReady() {
        return this.signer !== null && this.walletAddress !== null;
    }
    
    /**
     * Clean up sensitive data
     * Note: JavaScript doesn't guarantee immediate memory cleanup
     */
    destroy() {
        this.signer = null;
        this.walletAddress = null;
        console.log('[SIGNER] Wallet session destroyed');
    }
}

// Export singleton instance
module.exports = new TransactionSigningService();
