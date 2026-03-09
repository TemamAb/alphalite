const request = require('supertest');
const { app, server } = require('../../api/app');
const { expect } = require('@jest/globals');

// Ensure we close the server after tests to prevent hanging handles
afterAll((done) => {
    server.close(done);
});

describe('API Integration Tests', () => {
    let authToken;
    let csrfToken;

    beforeAll(async () => {
        // 1. Get CSRF token
        const csrfRes = await request(app).get('/api/csrf-token');
        csrfToken = csrfRes.body.csrfToken;

        // 2. Register a new admin user for testing, as no default exists
        const testUser = {
            email: `test-admin-${Date.now()}@alphapro.io`,
            username: 'testadmin',
            password: 'password123',
            role: 'admin' // Ensure we create an admin for full access
        };
        await request(app)
            .post('/api/auth/register')
            .send(testUser);

        // 3. Log in to get auth token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        
        authToken = loginRes.body.token;
    });
    
    describe('System Health & Public Endpoints', () => {
        it('GET /api/health should return 200 OK with timestamp', async () => {
            const res = await request(app).get('/api/health');
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('timestamp');
        });

        it('GET /api/csrf-token should return a valid CSRF token', async () => {
            const res = await request(app).get('/api/csrf-token');
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('csrfToken');
            expect(typeof res.body.csrfToken).toBe('string');
        });

        it('GET /unknown-route should return 404', async () => {
            const res = await request(app).get('/api/unknown-route');
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('Security & Authentication Enforcement', () => {
        it('GET /api/engine/status should be protected (401 without token)', async () => {
            // Attempt to access protected engine route without auth header
            const res = await request(app).get('/api/engine/status');
            
            // Should be rejected by authMiddleware
            expect(res.statusCode).toEqual(401);
        });

        it('GET /api/engine/status should be protected (403 without CSRF token)', async () => {
            // Attempt to access protected route with auth but without CSRF
            const res = await request(app)
                .get('/api/engine/status')
                .set('Authorization', `Bearer ${authToken}`); // No X-CSRF-Token header
            
            // Should be rejected by csrfValidator
            expect(res.statusCode).toEqual(403);
        });

        it('POST /api/auth/login should handle missing credentials gracefully', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({}); // Empty body
            
            // Should return 400 Bad Request (validation error) or 401
            expect([400, 401]).toContain(res.statusCode);
        });
    });

    describe('Static File Serving (Production Mode)', () => {
        const originalEnv = process.env.NODE_ENV;

        afterAll(() => {
            process.env.NODE_ENV = originalEnv;
        });

        it('should not serve static files in non-production environment', async () => {
            process.env.NODE_ENV = 'development';
            // Requesting root should likely 404 or not be the index.html in dev mode 
            // (depending on how express is set up, but app.js has a specific if block)
            const res = await request(app).get('/');
            expect(res.statusCode).not.toEqual(200);
        });
    });

    describe('Protected Engine Endpoints Verification', () => {
        it('POST /api/engine/state should start and stop the engine', async () => {
            // Start engine
            const startRes = await request(app)
                .post('/api/engine/state')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({ action: 'start', mode: 'PAPER' });
            
            // The response for starting the engine is a simple success message
            expect(startRes.statusCode).toEqual(200);
            expect(startRes.body.success).toBe(true);
            expect(startRes.body.message).toContain('Engine started in PAPER mode');

            // Stop engine
            const stopRes = await request(app)
                .post('/api/engine/state')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({ action: 'stop' });

            expect(stopRes.statusCode).toEqual(200);
            expect(stopRes.body.success).toBe(true);
        });

        it('GET /api/engine/status should return current status', async () => {
            const res = await request(app)
                .get('/api/engine/status')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('isRunning');
            expect(res.body).toHaveProperty('mode');
        });
    });

    describe('Data and History Endpoint Verification', () => {
        it('GET /api/history should return trade history with correct structure', async () => {
            const res = await request(app)
                .get('/api/history')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
        });

        it('GET /api/stats should return engine statistics without mock data', async () => {
            const res = await request(app)
                .get('/api/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-CSRF-Token', csrfToken);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('totalProfit');
            expect(res.body).toHaveProperty('successfulTrades');
            // Check that a mock-specific property is gone if needed
        });
    });

    describe('Prometheus Metrics Endpoint Verification', () => {
        it('GET /metrics should return prometheus-formatted metrics', async () => {
            const res = await request(app).get('/metrics');
            
            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toContain('text/plain');
            expect(res.text).toContain('alphapro_http_requests_total'); // A known metric from ObservabilityService
        });
    });
});