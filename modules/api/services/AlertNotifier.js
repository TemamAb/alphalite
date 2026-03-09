// AlertNotifier.js - Production Alert System
// Supports Slack, PagerDuty, Email, and Webhook notifications

const axios = require('axios');

class AlertNotifier {
    constructor() {
        // Slack configuration
        this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.slackChannel = process.env.SLACK_CHANNEL || '#alerts';
        
        // PagerDuty configuration
        this.pagerDutyApiKey = process.env.PAGERDUTY_API_KEY;
        this.pagerDutyServiceId = process.env.PAGERDUTY_SERVICE_ID;
        
        // Email configuration
        this.smtpHost = process.env.SMTP_HOST;
        this.smtpPort = process.env.SMTP_PORT || 587;
        this.smtpUser = process.env.SMTP_USER;
        this.smtpPass = process.env.SMTP_PASS;
        this.alertEmail = process.env.ALERT_EMAIL;
        
        // Webhook configuration
        this.webhookUrls = process.env.ALERT_WEBHOOK_URLS 
            ? process.env.ALERT_WEBHOOK_URLS.split(',') 
            : [];
        
        // Alert levels
        this.levels = {
            INFO: 'info',
            WARNING: 'warning',
            ERROR: 'error',
            CRITICAL: 'critical'
        };
        
        console.log('[ALERTS] AlertNotifier initialized');
    }

    /**
     * Send alert to all configured channels
     */
    async sendAlert(title, message, level = 'info', metadata = {}) {
        const alerts = [];
        
        try {
            // Send to Slack
            if (this.slackWebhookUrl) {
                alerts.push(this.sendSlackAlert(title, message, level));
            }
            
            // Send to PagerDuty for errors and critical
            if (this.pagerDutyApiKey && (level === 'error' || level === 'critical')) {
                alerts.push(this.sendPagerDutyAlert(title, message, level, metadata));
            }
            
            // Send to email for warnings and above
            if (this.smtpHost && this.alertEmail && (level === 'warning' || level === 'critical')) {
                alerts.push(this.sendEmailAlert(title, message, level));
            }
            
            // Send to webhooks
            if (this.webhookUrls.length > 0) {
                alerts.push(this.sendWebhookAlerts(title, message, level, metadata));
            }
            
            await Promise.allSettled(alerts);
            console.log(`[ALERTS] Alert sent: ${level} - ${title}`);
            
        } catch (error) {
            console.error('[ALERTS] Error sending alerts:', error.message);
        }
    }

    /**
     * Send Slack webhook notification
     */
    async sendSlackAlert(title, message, level) {
        const colorMap = {
            info: '#36a64f',
            warning: '#ff9800',
            error: '#f44336',
            critical: '#9c27b0'
        };
        
        const payload = {
            channel: this.slackChannel,
            username: 'AlphaPro Alerts',
            icon_emoji: ':warning:',
            attachments: [{
                color: colorMap[level] || '#36a64f',
                title: `🔔 ${title}`,
                text: message,
                fields: [
                    { title: 'Level', value: level.toUpperCase(), short: true },
                    { title: 'Environment', value: process.env.NODE_ENV || 'development', short: true },
                    { title: 'Timestamp', value: new Date().toISOString(), short: false }
                ],
                footer: 'AlphaPro Flash Loan Engine',
                ts: Math.floor(Date.now() / 1000)
            }]
        };
        
        try {
            await axios.post(this.slackWebhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('[ALERTS] Slack alert sent successfully');
        } catch (error) {
            console.error('[ALERTS] Slack alert failed:', error.message);
        }
    }

    /**
     * Send PagerDuty incident
     */
    async sendPagerDutyAlert(title, message, level, metadata) {
        const urgency = level === 'critical' ? 'high' : 'low';
        
        const payload = {
            routing_key: this.pagerDutyServiceId,
            event_action: 'trigger',
            urgency,
            payload: {
                summary: title,
                severity: level,
                source: 'AlphaPro Flash Loan Engine',
                custom_details: {
                    message,
                    metadata,
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString()
                }
            }
        };
        
        try {
            await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token token=${this.pagerDutyApiKey}`
                }
            });
            console.log('[ALERTS] PagerDuty alert sent successfully');
        } catch (error) {
            console.error('[ALERTS] PagerDuty alert failed:', error.message);
        }
    }

    /**
     * Send email alert
     */
    async sendEmailAlert(title, message, level) {
        // Simple implementation - in production use nodemailer
        console.log(`[ALERTS] EMAIL ALERT [${level.toUpperCase()}]: ${title} - ${message}`);
        // In production, implement actual email sending:
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransport({...});
        // await transporter.sendMail({...});
    }

    /**
     * Send webhook notifications
     */
    async sendWebhookAlerts(title, message, level, metadata) {
        const payload = {
            title,
            message,
            level,
            metadata,
            timestamp: new Date().toISOString(),
            source: 'AlphaPro Flash Loan Engine'
        };
        
        const promises = this.webhookUrls.map(async (url) => {
            try {
                await axios.post(url, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                });
            } catch (error) {
                console.error(`[ALERTS] Webhook alert failed for ${url}:`, error.message);
            }
        });
        
        await Promise.allSettled(promises);
    }

    /**
     * Convenience methods for common alert types
     */
    async alertTradeExecuted(trade) {
        await this.sendAlert(
            'Trade Executed',
            `Trade ${trade.id}: ${trade.tokenIn} → ${trade.tokenOut}, Amount: ${trade.amountIn}`,
            'info',
            trade
        );
    }

    async alertTradeFailed(trade, error) {
        await this.sendAlert(
            'Trade Failed',
            `Trade ${trade.id} failed: ${error}`,
            'error',
            { trade, error }
        );
    }

    async alertHighProfit(profit) {
        await this.sendAlert(
            'High Profit Alert',
            `Profit threshold exceeded: ${profit} ETH`,
            'warning',
            { profit }
        );
    }

    async alertCircuitBreaker(reason) {
        await this.sendAlert(
            'CIRCUIT BREAKER TRIGGERED',
            `Emergency: ${reason}`,
            'critical',
            { reason, timestamp: new Date().toISOString() }
        );
    }

    async alertUnauthorizedAccess(ip, endpoint) {
        await this.sendAlert(
            'Unauthorized Access Attempt',
            `IP: ${ip} attempted to access: ${endpoint}`,
            'warning',
            { ip, endpoint }
        );
    }
}

// Export singleton instance
module.exports = new AlertNotifier();

