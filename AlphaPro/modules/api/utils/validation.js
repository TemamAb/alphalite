// validation.js - Input validation utilities

const Joi = require('joi');

// Validate Ethereum address
const ethAddressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);

// Validate private key (should start with 0x and be 64 hex chars)
const privateKeySchema = Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/);

// Validate email
const emailSchema = Joi.string().email();

// Validate trade request
const tradeRequestSchema = Joi.object({
    pair: Joi.string().required().pattern(/^[A-Z]+\/[A-Z]+$/),
    side: Joi.string().valid('BUY', 'SELL').required(),
    amount: Joi.number().positive().required(),
    price: Joi.number().positive().optional(),
    type: Joi.string().valid('MARKET', 'LIMIT').default('MARKET'),
});

// Validate wallet import
const walletImportSchema = Joi.object({
    address: ethAddressSchema.required(),
    name: Joi.string().min(1).max(50).optional(),
    chain: Joi.string().valid('ethereum', 'arbitrum', 'optimism', 'polygon', 'bsc', 'base', 'avalanche').default('ethereum'),
    privateKey: privateKeySchema.optional(),
});

// Validate wallet address only (no private key)
const walletAddressSchema = Joi.object({
    address: ethAddressSchema.required(),
});

// Validate wallet configuration
const walletConfigSchema = Joi.object({
    walletAddress: ethAddressSchema.required(),
    privateKey: privateKeySchema.required(),
});

// Validate withdraw request
const withdrawSchema = Joi.object({
    mode: Joi.string().valid('PAPER', 'LIVE').required(),
    amount: Joi.number().positive().max(1000000).required(),
});

// Validate login request
const loginSchema = Joi.object({
    email: emailSchema.required(),
    password: Joi.string().min(8).required(),
});

// Validate engine mode
const engineModeSchema = Joi.object({
    action: Joi.string().valid('start', 'pause', 'resume').required(),
    mode: Joi.string().valid('PAPER', 'LIVE').required(),
});

// Validate trading settings
const tradingSettingsSchema = Joi.object({
    reinvestmentRate: Joi.number().min(0).max(100).optional(),
    capitalVelocity: Joi.number().min(1).max(500).optional(),
});

// Validate engine config
const engineConfigSchema = Joi.object({
    mode: Joi.string().valid('paper', 'live', 'backtest').default('paper'),
    maxPositionSize: Joi.number().positive().default(1),
    stopLoss: Joi.number().min(0).max(100).default(5),
    takeProfit: Joi.number().min(0).max(100).default(10),
    allowedSlippage: Joi.number().min(0).max(100).default(0.5),
});

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const details = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ 
                error: `Validation error: ${details}`,
                code: 'VALIDATION_ERROR'
            });
        }

        req.validatedBody = value;
        next();
    };
};

// Query validation
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const details = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ 
                error: `Validation error: ${details}`,
                code: 'VALIDATION_ERROR'
            });
        }

        req.validatedQuery = value;
        next();
    };
};

module.exports = {
    ethAddressSchema,
    privateKeySchema,
    emailSchema,
    tradeRequestSchema,
    walletImportSchema,
    walletAddressSchema,
    walletConfigSchema,
    withdrawSchema,
    loginSchema,
    engineModeSchema,
    tradingSettingsSchema,
    engineConfigSchema,
    validateRequest,
    validateQuery
};
