// validation.js - Request validation schemas using Zod
// AlphaPro API - Input validation middleware

const { z } = require('zod');

// ==================== Common Schemas ====================

// Ethereum address schema
const ethAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// Positive number schema
const positiveNumber = z.number().positive();

// Optional positive number
const optionalPositiveNumber = z.number().positive().optional();

// ==================== Trade Execution Schema ====================

const executeTradeSchema = z.object({
    // Input token (required)
    tokenIn: ethAddressSchema,
    
    // Output token (required)
    tokenOut: ethAddressSchema,
    
    // Amount in wei (required, positive)
    amountIn: positiveNumber,
    
    // Minimum profit in wei (optional)
    minProfit: optionalPositiveNumber,
    
    // Swap path (optional, array of addresses)
    path: z.array(ethAddressSchema).optional(),
    
    // Deadline timestamp (optional)
    deadline: z.number().int().positive().optional(),
    
    // Gas price limit in wei (optional)
    gasPriceLimit: optionalPositiveNumber,
});

// ==================== Wallet Schema ====================

const createWalletSchema = z.object({
    name: z.string().min(1).max(100),
    network: z.enum(['mainnet', 'goerli', 'sepolia', 'arbitrum', 'optimism']),
});

// ==================== Strategy Toggle Schema ====================

const toggleStrategySchema = z.object({
    enabled: z.boolean(),
});

// ==================== Pagination Schema ====================

const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

// ==================== AI & Copilot Schemas ====================

const optimizerConfigSchema = z.object({
    mutationRate: z.number().min(0.01).max(1.0).optional(),
    optimizationInterval: z.number().int().min(1000).optional(),
});

const copilotActionSchema = z.object({
    action: z.enum(['create', 'update', 'delete', 'read', 'system_update', 'restore']),
    filePath: z.string().optional(), // FileSystemService handles path traversal checks
    content: z.string().optional(),
});


// ==================== Validation Middleware ====================

/**
 * Validate request against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Validate request body
            const validated = schema.parse(req.body);
            
            // Replace body with validated data (sanitized)
            req.body = validated;
            
            next();
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            
            return res.status(500).json({
                error: 'Validation error',
                message: 'Unknown validation error'
            });
        }
    };
};

/**
 * Validate query parameters against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.query);
            req.query = validated;
            next();
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};

// ==================== Export ====================

module.exports = {
    // Schemas
    ethAddressSchema,
    executeTradeSchema,
    createWalletSchema,
    toggleStrategySchema,
    paginationSchema,
    optimizerConfigSchema,
    copilotActionSchema,
    
    // Middleware
    validateRequest,
    validateQuery,
    
    // Zod for direct use
    z
};
</parameter>
</create_file>
