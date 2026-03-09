// api.test.js - API Integration Tests
// Tests authentication, rate limiting, and input validation

const request = require('supertest');
const app = require('../../modules/api/app');

describe('AlphaPro API Integration Tests', () => {
    
    let authToken = null;
    const testUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'testpass123'
    };

    // ============ AUTHENTICATION TESTS ============
    
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);
            
            expect(res.status).toBe(201);
            expect(res.body.user).toHaveProperty('email', testUser.email);
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should reject duplicate email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);
            
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('USER_EXISTS');
        });

        it('should reject invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...testUser, email: 'invalid' });
            
            expect(res.status).toBe(400);
        });

        it('should reject short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...testUser, password: 'short' });
            
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('refreshToken');
            authToken = res.body.token;
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrongpassword' });
            
            expect(res.status).toBe(401);
            expect(res.body.code).toBe('INVALID_CREDENTIALS');
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });
            
            expect(res.status).toBe(401);
        });
    });

    // ============ RATE LIMITING TESTS ============

    describe('Rate Limiting', () => {
        it('should rate limit auth endpoints', async () => {
            // Try to login 6 times (limit is 5 per 15 min)
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({ email: testUser.email, password: 'wrongpassword' });
            }
            
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrongpassword' });
            
            expect(res.status).toBe(429);
        });
    });

    // ============ PROTECTED ROUTES TESTS ============

    describe('Protected Routes (Require Auth)', () => {
        it('should reject unauthenticated requests to /api/history', async () => {
            const res = await request(app).get('/api/history');
            expect(res.status).toBe(401);
        });

        it('should reject unauthenticated requests to /api/positions', async () => {
            const res = await request(app).get('/api/positions');
            expect(res.status).toBe(401);
        });

        it('should reject unauthenticated requests to /api/stats', async () => {
            const res = await request(app).get('/api/stats');
            expect(res.status).toBe(401);
        });

        it('should reject unauthenticated requests to /api/executeTrade', async () => {
            const res = await request(app)
                .post('/api/executeTrade')
                .send({ tokenIn: '0x1234', amountIn: 1000 });
            expect(res.status).toBe(401);
        });
    });

    describe('Authenticated Requests', () => {
        it('should allow authenticated access to /api/history', async () => {
            const res = await request(app)
                .get('/api/history')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('trades');
        });

        it('should allow authenticated access to /api/stats', async () => {
            const res = await request(app)
                .get('/api/stats')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalTrades');
        });
    });

    // ============ INPUT VALIDATION TESTS ============

    describe('Input Validation - executeTrade', () => {
        it('should reject invalid tokenIn address', async () => {
            const res = await request(app)
                .post('/api/executeTrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ 
                    tokenIn: 'invalid_address', 
                    tokenOut: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
                    amountIn: 1000 
                });
            
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('should reject negative amountIn', async () => {
            const res = await request(app)
                .post('/api/executeTrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ 
                    tokenIn: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
                    tokenOut: '0xA0b86a33E6441C4C4A0b86A33E6441C4C4A0b86a3',
                    amountIn: -100 
                });
            
            expect(res.status).toBe(400);
        });

        it('should reject invalid dex', async () => {
            const res = await request(app)
                .post('/api/executeTrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ 
                    tokenIn: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E',
                    tokenOut: '0xA0b86a33E6441C4C4A0b86A33E6441C4C4A0b86a3',
                    amountIn: 1000,
                    dex: 'invalid_dex'
                });
            
            expect(res.status).toBe(400);
        });
    });

    describe('Input Validation - market/:pair', () => {
        it('should reject invalid pair format', async () => {
            const res = await request(app)
                .get('/api/market/invalid_pair')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.status).toBe(400);
        });

        it('should accept valid pair format', async () => {
            const res = await request(app)
                .get('/api/market/ETH-USDC')
                .set('Authorization', `Bearer ${authToken}`);
            
            // May return 503 if API unavailable, but validation passes
            expect([200, 503]).toContain(res.status);
        });
    });

    describe('Input Validation - history', () => {
        it('should reject invalid limit', async () => {
            const res = await request(app)
                .get('/api/history?limit=999')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.status).toBe(400);
        });

        it('should reject invalid chain', async () => {
            const res = await request(app)
                .get('/api/history?chain=invalid_chain')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.status).toBe(400);
        });
    });

    // ============ HEALTH CHECK TESTS ============

    describe('Health Check', () => {
        it('should return OK without authentication', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });
    });
});

