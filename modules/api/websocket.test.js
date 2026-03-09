const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { server } = require('../../api/app');

// JWT_SECRET must be set in environment for tests to run
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be set for WebSocket tests');
}

let wsClient;
let port;

beforeAll((done) => {
    // Listen on ephemeral port to avoid conflicts
    server.listen(0, () => {
        port = server.address().port;
        done();
    });
});

afterAll((done) => {
    // Close client if open
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
    }
    // Close server to free up handles
    server.close(done);
});

describe('WebSocket Integration Tests', () => {
    
    it('should reject connection without token', (done) => {
        // Attempt connection without query params
        wsClient = new WebSocket(`ws://localhost:${port}`);
        
        wsClient.on('close', (code, reason) => {
            try {
                // Expect 4001 Authentication required (from app.js)
                expect(code).toBe(4001);
                expect(reason.toString()).toBe('Authentication required');
                done();
            } catch (error) {
                done(error);
            }
        });
        
        wsClient.on('error', (err) => {
            // Prevent unhandled error if connection is closed abruptly
        });
    });

    it('should reject connection with invalid token', (done) => {
        wsClient = new WebSocket(`ws://localhost:${port}?token=invalid_token_string`);
        
        wsClient.on('close', (code, reason) => {
            try {
                // Expect 4001 Invalid token (from app.js)
                expect(code).toBe(4001);
                expect(reason.toString()).toBe('Invalid token');
                done();
            } catch (error) {
                done(error);
            }
        });
        
        wsClient.on('error', (err) => {
            // Prevent unhandled error
        });
    });

    it('should accept connection with valid token', (done) => {
        // Generate a valid token using the same secret as the app
        const token = jwt.sign(
            { id: 1, email: 'test@example.com', role: 'user' }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        wsClient = new WebSocket(`ws://localhost:${port}?token=${token}`);
        
        wsClient.on('open', () => {
            try {
                expect(wsClient.readyState).toBe(WebSocket.OPEN);
                wsClient.close();
                done();
            } catch (error) {
                done(error);
            }
        });
        
        wsClient.on('error', (err) => {
            done(err);
        });
    });
});