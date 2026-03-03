/**

 * services/PreFlightCheck.js
 * Implements Protocol 12: The Pre-Flight Check Mandate.
 * Verifies connectivity to all critical infrastructure before engine start.
 */

const { Pool } = require('pg');
const { createClient } = require('redis');
const { KMSClient, GetPublicKeyCommand } = require("@aws-sdk/client-kms");

const axios = require('axios');
const path = require('path');
const config = require(path.join(__dirname, 'data_sources.json')); // FIX: In Docker, both are in /app

class PreFlightCheckService {

    async runAllChecks() {

      const checks = [
            { name: 'PostgreSQL Database', check: this.checkPostgres },
            { name: 'Redis Message Bus', check: this.checkRedis },
            { name: 'Data Providers', check: this.checkDataProviders },
            { name: 'Environment Variables', check: this.checkEnvVariables }
        ];

        const results = await Promise.all(checks.map(async (c) => {
            try {
                await c.check();
                return { name: c.name, status: 'OK', message: 'Check successful.' };
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
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        await pool.query('SELECT 1');
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



    async checkKms() {
        if (!process.env.AWS_KMS_KEY_ID) {
            console.warn("AWS_KMS_KEY_ID is not set. Skipping KMS check.");
            return;
        }
        if (!process.env.AWS_KMS_KEY_ID) throw new Error('AWS_KMS_KEY_ID not configured.');
        const kmsClient = new KMSClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const command = new GetPublicKeyCommand({ KeyId: process.env.AWS_KMS_KEY_ID });
        await kmsClient.send(command);
    }

    async checkDataProviders() {

        // Simple check against DexScreener
        await axios.get(`${config.tier2_discovery.dexscreener.base_url}/pairs/ethereum/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`);
    }

  async checkEnvVariables() {
        const requiredEnvVars = [
            'ALCHEMY_API_KEY',
            'DATABASE_URL',
            'REDIS_URL'
        ];

        requiredEnvVars.forEach(envVar => {
            if (!process.env[envVar]) {
                throw new Error(`Missing environment variable: ${envVar}`);
            }
        });
    }
}
module.exports = new PreFlightCheckService();