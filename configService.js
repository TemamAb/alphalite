// src/config/configService.js

const EventEmitter = require('events');
const fs = require('fs');

class ConfigService extends EventEmitter {
    constructor(configPath = 'src/config/config.json') {
        super();
        this.configPath = configPath;
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`[CONFIG] ❌ Failed to load configuration:`, error.message);
            return {};
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = newConfig;
        this.emit('config_update', this.config);
    }
}

const configService = new ConfigService();
module.exports = configService;