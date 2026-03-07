/**
 * Wallet Persistence Service
 * Handles wallet storage with encrypted private keys using database
 */

const database = require('../utils/database');
const encryption = require('../utils/encryption');

class WalletPersistenceService {
    constructor() {
        this.prisma = null;
        this.initialized = false;
    }
    
    /**
     * Initialize database connection
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            this.prisma = database.getPrismaClient();
            if (this.prisma) {
                await this.prisma.$connect();
                this.initialized = true;
                console.log('[WALLET-PERSISTENCE] Database connected');
            }
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to initialize:', error.message);
        }
    }
    
    /**
     * Save wallet with encrypted private key
     */
    async saveWallet(address, privateKey, chain = 'ethereum') {
        await this.initialize();
        
        if (!this.prisma) {
            console.warn('[WALLET-PERSISTENCE] Database not available, using in-memory');
            return null;
        }
        
        try {
            // Encrypt private key before storage
            const encryptedKey = privateKey ? encryption.encrypt(privateKey) : null;
            
            const wallet = await this.prisma.wallet.upsert({
                where: { address: address.toLowerCase() },
                update: {
                    privateKeyEncrypted: encryptedKey,
                    chain,
                    updatedAt: new Date()
                },
                create: {
                    address: address.toLowerCase(),
                    privateKeyEncrypted: encryptedKey,
                    chain,
                    balance: 0,
                    totalProfit: 0,
                    isActive: true
                }
            });
            
            console.log(`[WALLET-PERSISTENCE] Wallet saved: ${address}`);
            return wallet;
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to save wallet:', error.message);
            return null;
        }
    }
    
    /**
     * Get wallet by address
     */
    async getWallet(address) {
        await this.initialize();
        
        if (!this.prisma) return null;
        
        try {
            return await this.prisma.wallet.findUnique({
                where: { address: address.toLowerCase() }
            });
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to get wallet:', error.message);
            return null;
        }
    }
    
    /**
     * Get all wallets
     */
    async getAllWallets() {
        await this.initialize();
        
        if (!this.prisma) return [];
        
        try {
            return await this.prisma.wallet.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to get wallets:', error.message);
            return [];
        }
    }
    
    /**
     * Get decrypted private key for a wallet
     */
    async getDecryptedKey(address) {
        const wallet = await this.getWallet(address);
        
        if (!wallet || !wallet.privateKeyEncrypted) {
            return null;
        }
        
        try {
            return encryption.decrypt(wallet.privateKeyEncrypted);
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to decrypt key:', error.message);
            return null;
        }
    }
    
    /**
     * Update wallet balance
     */
    async updateBalance(address, balance) {
        await this.initialize();
        
        if (!this.prisma) return null;
        
        try {
            return await this.prisma.wallet.update({
                where: { address: address.toLowerCase() },
                data: { balance, updatedAt: new Date() }
            });
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to update balance:', error.message);
            return null;
        }
    }
    
    /**
     * Update wallet profit
     */
    async updateProfit(address, profit) {
        await this.initialize();
        
        if (!this.prisma) return null;
        
        try {
            const wallet = await this.getWallet(address);
            if (!wallet) return null;
            
            return await this.prisma.wallet.update({
                where: { address: address.toLowerCase() },
                data: { 
                    totalProfit: wallet.totalProfit + profit,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to update profit:', error.message);
            return null;
        }
    }
    
    /**
     * Delete wallet (soft delete)
     */
    async deleteWallet(address) {
        await this.initialize();
        
        if (!this.prisma) return false;
        
        try {
            await this.prisma.wallet.update({
                where: { address: address.toLowerCase() },
                data: { isActive: false, updatedAt: new Date() }
            });
            return true;
        } catch (error) {
            console.error('[WALLET-PERSISTENCE] Failed to delete wallet:', error.message);
            return false;
        }
    }
}

// Export singleton
const walletPersistence = new WalletPersistenceService();

module.exports = walletPersistence;
