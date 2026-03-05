/**
 * Bribe Configuration Service
 * Manages default and strategy-specific bribe percentages for the GasPriceOracle.
 */
class BribeConfigService {
    constructor() {
        this.config = {
            // Default profit share percentage based on risk
            defaultBribeShares: {
                'Low': 10,    // 10%
                'Medium': 40, // 40%
                'High': 90,   // 90%
            },
            // Manual overrides for specific strategies (e.g., { "Sandwich Attack": 95 })
            strategyOverrides: {} 
        };
        console.log('[BRIBE-CONFIG] Initialized with default bribe shares.');
    }

    /**
     * Gets the bribe share percentage for a given strategy.
     * Returns override if it exists, otherwise falls back to default for the risk profile.
     */
    getBribeShare(strategyName, riskProfile) {
        if (this.config.strategyOverrides.hasOwnProperty(strategyName)) {
            return this.config.strategyOverrides[strategyName];
        }
        return this.config.defaultBribeShares[riskProfile] || 20; // Default to 20% if risk profile is unknown
    }

    getSettings() {
        return this.config;
    }

    updateSettings(newSettings) {
        this.config.strategyOverrides = { ...this.config.strategyOverrides, ...newSettings.strategyOverrides };
        console.log('[BRIBE-CONFIG] Strategy overrides updated:', this.config.strategyOverrides);
    }
}

module.exports = new BribeConfigService();