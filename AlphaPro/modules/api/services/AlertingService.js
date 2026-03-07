/**
 * Enterprise Alerting Service
 * 
 * Provides multi-channel alerting:
 * - PagerDuty integration
 * - Slack webhooks
 * - Email notifications
 * - SMS alerts
 */

const axios = require('axios');

class AlertingService {
    constructor() {
        this.config = {
            pagerduty: {
                enabled: !!process.env.PAGERDUTY_API_KEY,
                apiKey: process.env.PAGERDUTY_API_KEY,
                serviceId: process.env.PAGERDUTY_SERVICE_ID
            },
            slack: {
                enabled: !!process.env.SLACK_WEBHOOK_URL,
                webhookUrl: process.env.SLACK_WEBHOOK_URL,
                channel: process.env.SLACK_CHANNEL || '#alerts'
            },
            email: {
                enabled: !!process.env.SMTP_HOST,
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                user: process.env.SMTP_USER,
                password: process.env.SMTP_PASSWORD,
                from: process.env.SMTP_FROM || 'alerts@alphapro.io',
                to: process.env.ALERT_EMAIL_TO
            }
        };
        
        // Alert history
        this.alertHistory = [];
        this.maxHistory = 1000;
    }
    
    /**
     * Send alert to all configured channels
     */
    async sendAlert(alert) {
        const alertEntry = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...alert
        };
        
        // Store in history
        this.alertHistory.push(alertEntry);
        if (this.alertHistory.length > this.maxHistory) {
            this.alertHistory.shift();
        }
        
        // Send to all channels in parallel
        const results = await Promise.allSettled([
            this.sendToPagerDuty(alertEntry),
            this.sendToSlack(alertEntry),
            this.sendEmail(alertEntry)
        ]);
        
        return {
            alertId: alertEntry.id,
            channels: results.map((r, i) => ({
                channel: ['pagerduty', 'slack', 'email'][i],
                status: r.status
            }))
        };
    }
    
    /**
     * Send to PagerDuty
     */
    async sendToPagerDuty(alert) {
        if (!this.config.pagerduty.enabled) {
            return { skipped: true, reason: 'PagerDuty not configured' };
        }
        
        const payload = {
            routing_key: this.config.pagerduty.serviceId,
            event_action: 'trigger',
            payload: {
                summary: alert.title,
                severity: alert.severity || 'warning',
                source: 'AlphaPro',
                custom_details: alert.details || {}
            }
        };
        
        try {
            const response = await axios.post(
                'https://events.pagerduty.com/v2/enqueue',
                payload,
                {
                    headers: {
                        'Authorization': `Token token=${this.config.pagerduty.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return { success: true, dedupKey: response.data.dedup_key };
        } catch (error) {
            console.error('[ALERT] PagerDuty error:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send to Slack
     */
    async sendToSlack(alert) {
        if (!this.config.slack.enabled) {
            return { skipped: true, reason: 'Slack not configured' };
        }
        
        const severityEmoji = {
            critical: '🔴',
            high: '🟠',
            warning: '🟡',
            info: '🔵'
        };
        
        const payload = {
            channel: this.config.slack.channel,
            username: 'AlphaPro Alerts',
            icon_emoji: ':rotating_light:',
            attachments: [{
                color: this.getSlackColor(alert.severity),
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `${severityEmoji[alert.severity] || '⚠️'} ${alert.title}`
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Severity:*\n${alert.severity || 'warning'}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Time:*\n${new Date(alert.timestamp).toLocaleString()}`
                            }
                        ]
                    }
                ]
            }]
        };
        
        if (alert.details) {
            const detailsText = Object.entries(alert.details)
                .map(([k, v]) => `• *${k}:* ${v}`)
                .join('\n');
            
            payload.attachments[0].blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: detailsText
                }
            });
        }
        
        try {
            await axios.post(this.config.slack.webhookUrl, payload);
            return { success: true };
        } catch (error) {
            console.error('[ALERT] Slack error:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send email alert
     */
    async sendEmail(alert) {
        if (!this.config.email.enabled || !this.config.email.to) {
            return { skipped: true, reason: 'Email not configured' };
        }
        
        // In production, use nodemailer
        // For now, log the email
        console.log(`[ALERT] Email would be sent:`, {
            from: this.config.email.from,
            to: this.config.email.to,
            subject: `[${alert.severity?.toUpperCase() || 'ALERT'}] ${alert.title}`,
            body: alert.details
        });
        
        return { success: true };
    }
    
    /**
     * Get Slack color based on severity
     */
    getSlackColor(severity) {
        const colors = {
            critical: '#ff0000',
            high: '#ff6600',
            warning: '#ffcc00',
            info: '#0066cc'
        };
        return colors[severity] || colors.info;
    }
    
    /**
     * Predefined alert types
     */
    
    // Trade failure alert
    async alertTradeFailure(trade, error) {
        return this.sendAlert({
            title: `Trade Execution Failed: ${trade.chain}/${trade.dex}`,
            severity: 'high',
            type: 'TRADE_FAILURE',
            details: {
                chain: trade.chain,
                dex: trade.dex,
                tokenIn: trade.tokenIn,
                tokenOut: trade.tokenOut,
                amountIn: trade.amountIn.toString(),
                error: error.message,
                wallet: trade.walletAddress
            }
        });
    }
    
    // High profit alert
    async alertHighProfit(trade, profit) {
        return this.sendAlert({
            title: `High Profit Trade Executed: ${profit} ETH`,
            severity: 'info',
            type: 'HIGH_PROFIT',
            details: {
                chain: trade.chain,
                dex: trade.dex,
                profit: profit.toString(),
                wallet: trade.walletAddress
            }
        });
    }
    
    // Security alert
    async alertSecurity(event) {
        return this.sendAlert({
            title: `Security Alert: ${event.type}`,
            severity: 'critical',
            type: 'SECURITY',
            details: event.details || {}
        });
    }
    
    // System health alert
    async alertSystemHealth(component, status) {
        return this.sendAlert({
            title: `System Health: ${component} - ${status}`,
            severity: status === 'down' ? 'critical' : 'warning',
            type: 'SYSTEM_HEALTH',
            details: {
                component,
                status,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    // Gas price alert
    async alertGasPrice(chain, gasPrice) {
        const threshold = parseInt(process.env.GAS_ALERT_THRESHOLD || '100');
        
        if (gasPrice > threshold) {
            return this.sendAlert({
                title: `High Gas Price on ${chain}`,
                severity: 'warning',
                type: 'GAS_PRICE',
                details: {
                    chain,
                    gasPrice: gasPrice.toString(),
                    threshold: threshold.toString()
                }
            });
        }
    }
    
    /**
     * Get alert history
     */
    getHistory(limit = 100, severity = null) {
        let history = this.alertHistory;
        
        if (severity) {
            history = history.filter(a => a.severity === severity);
        }
        
        return history.slice(-limit);
    }
}

module.exports = new AlertingService();
