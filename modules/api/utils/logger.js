// logger.js - Logging utility for the API

const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

class Logger {
    constructor(service = 'API') {
        this.service = service;
        this.level = process.env.LOG_LEVEL || LOG_LEVELS.INFO;
    }

    log(level, message, meta = {}) {
        const levels = [LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG];
        
        // Only log if the level is allowed
        if (levels.indexOf(level) > levels.indexOf(this.level)) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            service: this.service,
            message,
            ...meta
        };

        // Console output with colors
        const colors = {
            error: '\x1b[31m',
            warn: '\x1b[33m',
            info: '\x1b[36m',
            debug: '\x1b[90m',
            reset: '\x1b[0m'
        };

        console.log(`${colors[level]}[${timestamp}] ${level.toUpperCase()} [${this.service}]${colors.reset} ${message}`);
    }

    error(message, meta) {
        this.log(LOG_LEVELS.ERROR, message, meta);
    }

    warn(message, meta) {
        this.log(LOG_LEVELS.WARN, message, meta);
    }

    info(message, meta) {
        this.log(LOG_LEVELS.INFO, message, meta);
    }

    debug(message, meta) {
        this.log(LOG_LEVELS.DEBUG, message, meta);
    }
}

module.exports = { Logger, LOG_LEVELS };
