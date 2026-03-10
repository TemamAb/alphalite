const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

class BackupScheduler {
    constructor() {
        // Resolve path to the existing shell script
        this.scriptPath = path.resolve(__dirname, '../scripts/backup.sh');
        this.isRunning = false;
    }

    start() {
        console.log('[BACKUP] 🛡️ Backup Scheduler initialized');
        
        // Schedule daily backup at 03:00 UTC
        // Cron expression: Minute Hour Day Month DayOfWeek
        cron.schedule('0 3 * * *', () => {
            this.runBackup();
        });
        
        console.log('[BACKUP] 📅 Schedule set: Daily at 03:00 UTC');
    }

    async runBackup() {
        if (this.isRunning) {
            console.warn('[BACKUP] ⚠️ Backup already in progress, skipping scheduled run.');
            return;
        }

        this.isRunning = true;
        console.log('[BACKUP] 🔄 Starting automated database backup...');

        const child = spawn('bash', [this.scriptPath, 'backup'], {
            stdio: 'inherit', // Pipe output to parent process logs
            env: process.env  // Pass environment variables (DATABASE_URL, etc.)
        });

        child.on('close', (code) => {
            this.isRunning = false;
            if (code === 0) {
                console.log('[BACKUP] ✅ Database backup completed successfully.');
            } else {
                console.error(`[BACKUP] ❌ Database backup failed with exit code ${code}.`);
            }
        });

        child.on('error', (err) => {
            this.isRunning = false;
            console.error(`[BACKUP] ❌ Failed to spawn backup script: ${err.message}`);
        });
    }
}

module.exports = new BackupScheduler();