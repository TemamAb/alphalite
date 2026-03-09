/**
 * Capital Manager
 * Manages available capital and locks funds for executing trades.
 * PRODUCTION: Reads capital from environment or config service
 */
class CapitalManager {
    constructor() {
        // PRODUCTION: Read from environment variable with validation
        const envCapital = parseFloat(process.env.TOTAL_CAPITAL_ETH);
        this.totalCapital = (!isNaN(envCapital) && envCapital > 0) ? envCapital : 0;
        this.lockedCapital = 0.0;
        
        if (this.totalCapital === 0) {
            console.warn('[CAPITAL] WARNING: TOTAL_CAPITAL_ETH not set. Set via environment variable.');
        }
    }

    requestCapital(amount, opportunity) {
        if (this.totalCapital - this.lockedCapital >= amount) {
            this.lockedCapital += amount;
            return true;
        }
        return false;
    }

    releaseCapital(amount) {
        this.lockedCapital = Math.max(0, this.lockedCapital - amount);
    }

    getStatus() {
        return {
            total: this.totalCapital,
            locked: this.lockedCapital,
            available: this.totalCapital - this.lockedCapital
        };
    }
}

module.exports = new CapitalManager();