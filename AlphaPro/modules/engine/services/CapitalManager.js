/**
 * Capital Manager
 * Dynamically allocates and tracks the firm's trading capital (Capital Velocity).
 * This is a core component for enabling high-concurrency trading.
 */
class CapitalManager {
    constructor(totalCapital) {
        this.totalCapital = totalCapital; // e.g., 500 (for $500M)
        this.allocatedCapital = 0;
        console.log(`[CAPITAL] Manager initialized with $${this.totalCapital}M total velocity.`);
    }

    get availableCapital() {
        return this.totalCapital - this.allocatedCapital;
    }

    /**
     * Attempt to reserve a portion of the capital for a trade.
     * @param {number} amount - The amount of capital to request (in millions).
     * @param {object} opportunity - The opportunity details, used for logging.
     * @returns {boolean} - True if capital was successfully allocated.
     */
    requestCapital(amount, opportunity) {
        if (amount > this.availableCapital) {
            console.warn(`[CAPITAL] DENIED: Request for $${amount}M exceeds available $${this.availableCapital}M. Opportunity: ${opportunity.pair}`);
            return false;
        }
        this.allocatedCapital += amount;
        console.log(`[CAPITAL] GRANTED: $${amount}M for ${opportunity.pair}. Available: $${this.availableCapital}M`);
        return true;
    }

    /**
     * Release previously allocated capital back into the pool.
     * @param {number} amount - The amount of capital to release.
     */
    releaseCapital(amount) {
        this.allocatedCapital -= amount;
        if (this.allocatedCapital < 0) this.allocatedCapital = 0;
        console.log(`[CAPITAL] RELEASED: $${amount}M. Available: $${this.availableCapital}M`);
    }

    /**
     * Updates the total capital velocity limit.
     * @param {number} newTotal - The new total capital limit.
     */
    setTotalCapital(newTotal) {
        console.log(`[CAPITAL] Velocity updated from $${this.totalCapital}M to $${newTotal}M.`);
        this.totalCapital = newTotal;
    }

    getStatus() {
        return {
            totalCapital: this.totalCapital,
            allocatedCapital: this.allocatedCapital,
            availableCapital: this.availableCapital,
            utilization: this.totalCapital > 0 ? (this.allocatedCapital / this.totalCapital) * 100 : 0
        };
    }
}

// Singleton instance, initialized with a default. Will be updated by settings.
module.exports = new CapitalManager(100); // Default $100M