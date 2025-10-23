/**
 * API Test: Simulation Status Middleware
 *
 * This test suite verifies the simulation status middleware that prevents
 * pickup requests from being created when the simulation is not running.
 *
 * Tests cover:
 * - Pickup requests blocked when simulation stopped
 * - Pickup requests allowed when simulation running
 * - Proper error messages and status codes
 * - Middleware integration with Express routes
 */

import request from 'supertest';
import express from 'express';
import { requireSimulationRunning } from '../../utils/simulationStatusMiddleware';
import { autonomyService } from '../../services/AutonomyService';

// Create a test Express app
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Test route with simulation status middleware
    app.post('/api/test-endpoint', requireSimulationRunning, (req, res) => {
        res.status(200).json({ message: 'Request allowed' });
    });

    // Test route without middleware (control)
    app.post('/api/no-middleware', (req, res) => {
        res.status(200).json({ message: 'No middleware' });
    });

    return app;
};

describe('Simulation Status Middleware - API Tests', () => {
    let app: express.Application;

    beforeEach(() => {
        app = createTestApp();
        // Ensure simulation is stopped before each test
        if ((autonomyService as any).isRunning) {
            autonomyService.stop();
        }
    });

    afterEach(() => {
        // Clean up - stop simulation if running
        if ((autonomyService as any).isRunning) {
            autonomyService.stop();
        }
    });

    describe('When simulation is NOT running', () => {
        it('should return 503 Service Unavailable', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.status).toBe(503);
        });

        it('should return proper error structure', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
            expect(response.body.error).toBe('Service Unavailable');
        });

        it('should provide informative error message', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.body.message).toContain('simulation is not running');
            expect(response.body.message).toContain('Pickup requests cannot be created');
        });

        it('should block POST requests', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ some: 'data' });

            expect(response.status).toBe(503);
        });

        it('should not execute route handler when blocked', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.body.message).not.toBe('Request allowed');
        });
    });

    describe('When simulation IS running', () => {
        beforeEach(() => {
            // Start the simulation with a test timestamp
            const testStartTime = Date.now();
            autonomyService.start(testStartTime);
        });

        it('should allow request to proceed (return 200)', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.status).toBe(200);
        });

        it('should execute route handler successfully', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.body.message).toBe('Request allowed');
        });

        it('should not return 503 error', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.status).not.toBe(503);
        });

        it('should handle multiple sequential requests', async () => {
            const response1 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test1' });

            const response2 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test2' });

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
        });
    });

    describe('Simulation state transitions', () => {
        it('should block after simulation is stopped', async () => {
            // Start simulation
            autonomyService.start(Date.now());

            // First request should succeed
            const response1 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });
            expect(response1.status).toBe(200);

            // Stop simulation
            autonomyService.stop();

            // Second request should be blocked
            const response2 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });
            expect(response2.status).toBe(503);
        });

        it('should allow after simulation is restarted', async () => {
            // Initial state: simulation not running
            const response1 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });
            expect(response1.status).toBe(503);

            // Start simulation
            autonomyService.start(Date.now());

            // Request should now succeed
            const response2 = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });
            expect(response2.status).toBe(200);
        });

        it('should handle rapid start/stop cycles', async () => {
            // Rapid start/stop
            autonomyService.start(Date.now());
            autonomyService.stop();

            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.status).toBe(503);
        });
    });

    describe('Middleware isolation', () => {
        it('should not affect routes without middleware', async () => {
            // Simulation is stopped, but route without middleware should work
            const response = await request(app)
                .post('/api/no-middleware')
                .send({ data: 'test' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No middleware');
        });

        it('should only check simulation status for protected routes', async () => {
            autonomyService.stop();

            // Protected route should fail
            const protectedResponse = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });
            expect(protectedResponse.status).toBe(503);

            // Unprotected route should succeed
            const unprotectedResponse = await request(app)
                .post('/api/no-middleware')
                .send({ data: 'test' });
            expect(unprotectedResponse.status).toBe(200);
        });
    });

    describe('HTTP Methods', () => {
        it('should work with different HTTP methods when simulation is running', async () => {
            const testApp = express();
            testApp.use(express.json());

            // Add routes with different HTTP methods
            testApp.get('/api/test-get', requireSimulationRunning, (req, res) => {
                res.json({ method: 'GET' });
            });
            testApp.post('/api/test-post', requireSimulationRunning, (req, res) => {
                res.json({ method: 'POST' });
            });
            testApp.put('/api/test-put', requireSimulationRunning, (req, res) => {
                res.json({ method: 'PUT' });
            });

            autonomyService.start(Date.now());

            const getResponse = await request(testApp).get('/api/test-get');
            const postResponse = await request(testApp).post('/api/test-post').send({});
            const putResponse = await request(testApp).put('/api/test-put').send({});

            expect(getResponse.status).toBe(200);
            expect(postResponse.status).toBe(200);
            expect(putResponse.status).toBe(200);
        });
    });

    describe('Error response format', () => {
        it('should return JSON error response', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toBeInstanceOf(Object);
        });

        it('should not leak internal details in error message', async () => {
            const response = await request(app)
                .post('/api/test-endpoint')
                .send({ data: 'test' });

            const message = response.body.message.toLowerCase();
            expect(message).not.toContain('undefined');
            expect(message).not.toContain('null');
            expect(message).not.toContain('error:');
        });
    });
});
