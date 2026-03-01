/**
 * services/PreFlightCheck.js
 * Implements Protocol 12: The Pre-Flight Check Mandate.
 * Verifies connectivity to all critical infrastructure before engine start.
 */

const { Pool } = require('pg');
const { createClient } = require('redis');

class PreFlightCheckService {
    async runAllChecks() {

        const checks = [
            { name: 'PostgreSQL Database', check: this.checkPostgres },
            { name: 'Redis Message Bus', check: this.checkRedis },
            { name: 'Data Providers (Tier 2)', check: this.checkDataProviders },
        ];

        const results = await Promise.all(checks.map(async (c) => {
            try {
                await c.check();
                return { name: c.name, status: 'OK', message: 'Connection successful.' };
            } catch (error) {
                return { name: c.name, status: 'ERROR', message: error.message };
            }
        }));

        const allOk = results.every(r => r.status === 'OK');
        return { allOk, results };
    }

    async checkPostgres() {
         if (!process.env.DATABASE_URL) {
            console.warn("DATABASE_URL is not set. Skipping PostgreSQL check.");
            return;
        }

        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        await pool.end();
    }

    async checkRedis() {
         if (!process.env.REDIS_URL) {
            console.warn("REDIS_URL is not set. Skipping Redis check.");
            return;
        }
        const client = createClient({ url: process.env.REDIS_URL });
        await client.connect();
        await client.ping();
        await client.disconnect();
    }


    async checkDataProviders() {
        // Simple check against DexScreener
        const axios = require('axios');
        const path = require('path');
        const config = require(path.join(__dirname, '..', '..', '..', 'data_sources.json')); // AUDIT FIX: Corrected path to project root
        try {
            await axios.get(`${config.tier2_discovery.dexscreener.base_url}/pairs/eth/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`);
        } catch (error) {
            console.error("Data provider check failed:", error.message);
            throw new Error(`Failed to connect to data provider: ${error.message}`);
        }
    }
}

module.exports = new PreFlightCheckService();