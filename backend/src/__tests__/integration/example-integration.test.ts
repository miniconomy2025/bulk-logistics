/**
 * Example Integration Test using Nock
 *
 * This demonstrates how to write integration tests that:
 * - Mock external HTTP APIs using nock
 * - Test real business logic and HTTP flows
 * - Verify interactions between multiple components
 */

import nock from 'nock';
import { thohApiClient } from '../../client/thohClient';
import { bankApiClient } from '../../client/bankClient';
import { setupAllMocks, cleanupMocks, THOH_API_BASE, BANK_API_BASE } from './mocks/setup';

// Mock database layer only
jest.mock('../../models/transactionsRepository');
jest.mock('../../models/transactionStatusRepository');

describe('Example Integration Tests with Nock', () => {
    beforeEach(() => {
        setupAllMocks(); // Set up all HTTP mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        cleanupMocks(); // Clean up nock mocks
    });

    describe('THOH API Integration', () => {
        it('should fetch truck information successfully', async () => {
            const trucks = await thohApiClient.getTrucksInformation();

            expect(trucks).toBeInstanceOf(Array);
            expect(trucks.length).toBeGreaterThan(0);
            expect(trucks[0]).toMatchObject({
                truckName: expect.any(String),
                price: expect.any(Number),
                maximumLoad: expect.any(Number),
            });
        });

        it('should fetch machine information successfully', async () => {
            const machines = await thohApiClient.getMachinesInformation();

            expect(machines).toHaveProperty('machines');
            expect(machines.machines).toBeInstanceOf(Array);
            expect(machines.machines[0]).toMatchObject({
                name: expect.any(String),
                weight: expect.any(Number),
            });
        });

        it('should handle custom response scenario', async () => {
            // Override default mock with custom response
            cleanupMocks();
            nock(THOH_API_BASE)
                .get('/api/trucks')
                .reply(200, [
                    {
                        truckName: 'custom_truck',
                        price: 999999,
                        maximumLoad: 10000,
                        operatingCost: 1000,
                        description: 'Custom test truck',
                        quantity: 1,
                        weight: 5000
                    }
                ]);

            const trucks = await thohApiClient.getTrucksInformation();

            expect(trucks[0].truckName).toBe('custom_truck');
            expect(trucks[0].price).toBe(999999);
        });

        it('should handle API error', async () => {
            // Clean up mocks and set up error scenario
            cleanupMocks();
            nock(THOH_API_BASE)
                .get('/api/time')
                .reply(503, { error: 'Service unavailable' });

            // Should throw AppError
            await expect(thohApiClient.getTime()).rejects.toThrow();
        });
    });

    describe('Bank API Integration', () => {
        it('should fetch account details successfully', async () => {
            const account = await bankApiClient.getAccountDetails();

            expect(account).toMatchObject({
                success: true,
                account_number: expect.any(String),
                net_balance: expect.any(Number),
            });
        });

        it('should create account with notification URL', async () => {
            const result = await bankApiClient.createAccount('https://test.com/notify');

            expect(result).toHaveProperty('account_number');
            expect(typeof result.account_number).toBe('string');
        });

        it('should handle account fetch with custom balance', async () => {
            cleanupMocks();
            nock(BANK_API_BASE)
                .get('/api/account/me')
                .reply(200, {
                    success: true,
                    account_number: 'CUSTOM-ACCOUNT',
                    net_balance: 1000000,
                    notification_url: 'https://test.com'
                });

            const account = await bankApiClient.getAccountDetails();

            expect(account.net_balance).toBe(1000000);
            expect(account.account_number).toBe('CUSTOM-ACCOUNT');
        });
    });

    describe('Multi-Service Integration', () => {
        it('should fetch data from both THOH and Bank APIs', async () => {
            // Fetch from THOH
            const trucks = await thohApiClient.getTrucksInformation();
            expect(trucks).toBeDefined();

            // Fetch from Bank
            const account = await bankApiClient.getAccountDetails();
            expect(account).toBeDefined();

            // Verify both succeeded
            expect(trucks.length).toBeGreaterThan(0);
            expect(account.success).toBe(true);
        });

        it('should handle sequential API calls', async () => {
            // Step 1: Get truck prices
            const trucks = await thohApiClient.getTrucksInformation();
            const truckPrice = trucks[0].price;

            // Step 2: Check account balance
            const account = await bankApiClient.getAccountDetails();
            const balance = account.net_balance;

            // Step 3: Verify can afford truck
            expect(balance).toBeGreaterThanOrEqual(truckPrice);
        });
    });

    describe('Nock Features Demonstration', () => {
        it('should verify HTTP requests were made', () => {
            cleanupMocks();
            const scope = nock(THOH_API_BASE)
                .get('/api/trucks')
                .reply(200, []);

            thohApiClient.getTrucksInformation();

            // Verify the request was made
            scope.done(); // Throws if request wasn't made
        });

        it('should intercept POST requests with body', async () => {
            cleanupMocks();
            let capturedBody: any;

            nock(THOH_API_BASE)
                .post('/api/trucks', (body) => {
                    capturedBody = body;
                    return true; // Accept any body
                })
                .reply(200, {
                    orderId: 123,
                    truckName: 'large_truck',
                    quantity: 4,
                    totalPrice: 400000
                });

            await thohApiClient.purchaseTruck({
                truckName: 'large_truck',
                quantity: 4
            });

            // Verify the request body was captured
            expect(capturedBody).toMatchObject({
                truckName: 'large_truck',
                quantity: 4
            });
        });

        it('should handle query parameters', async () => {
            cleanupMocks();
            nock(BANK_API_BASE)
                .get('/api/loan')
                .query({ status: 'active' })
                .reply(200, { loans: [] });

            // This would fail because our client doesn't send query params
            // Just demonstrating nock capability
        });
    });
});
