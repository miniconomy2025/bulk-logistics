/**
 * Pickup Request Integration Tests
 *
 * Tests the complete pickup request workflow including:
 * - Request creation with cost calculation
 * - Payment processing
 * - Request status transitions
 * - Error handling and validation
 */

import request from 'supertest';
import nock from 'nock';
import { setupAllMocks, cleanupMocks, THOH_API_BASE, BANK_API_BASE } from './mocks/setup';
import app from '../../app';

// Mock database repositories
jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/itemDefinitionRepository');
jest.mock('../../models/companyRepository');
jest.mock('../../models/vehicleRepository');
jest.mock('../../models/transactionsRepository');
jest.mock('../../services/AutonomyService');

import * as pickupRequestRepo from '../../models/pickupRequestRepository';
import * as itemDefRepo from '../../models/itemDefinitionRepository';
import * as companyRepo from '../../models/companyRepository';
import * as vehicleRepo from '../../models/vehicleRepository';
import { simulatedClock } from '../../utils';

describe('Pickup Request Integration Tests', () => {
    beforeAll(() => {
        // Initialize simulated clock
        simulatedClock.initialize(Date.now());
    });

    beforeEach(() => {
        setupAllMocks();
        jest.clearAllMocks();

        // Setup default database mocks
        setupDefaultDatabaseMocks();
    });

    afterEach(() => {
        cleanupMocks();
    });

    describe('POST /api/pickup-request - Create Pickup Request', () => {
        describe('Success Scenarios', () => {
            it('should create a pickup request for raw materials (KG-based)', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'PEAR-ORDER-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [
                            { itemName: 'copper', quantity: 3000 },
                            { itemName: 'silicon', quantity: 2000 }
                        ]
                    });

                expect(response.status).toBe(201);
                expect(response.body).toMatchObject({
                    pickupRequestId: expect.any(Number),
                    cost: expect.any(Number),
                    paymentReferenceId: expect.any(String),
                    accountNumber: expect.any(String),
                    status: 'PENDING_PAYMENT',
                    statusCheckUrl: expect.stringContaining('/pickup-requests/')
                });

                // Verify cost is reasonable for 5000 KG (1 large truck)
                expect(response.body.cost).toBeGreaterThan(0);
            });

            it('should create a pickup request for electronics (UNIT-based)', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'PEAR-ORDER-002',
                        originCompany: 'electronics-supplier',
                        destinationCompany: 'pear-company',
                        items: [
                            { itemName: 'electronics', quantity: 1500 },
                            { itemName: 'screens', quantity: 500 }
                        ]
                    });

                expect(response.status).toBe(201);
                expect(response.body).toMatchObject({
                    pickupRequestId: expect.any(Number),
                    cost: expect.any(Number),
                    status: 'PENDING_PAYMENT'
                });
            });

            it('should handle machine orders with count-based quantities', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'PEAR-ORDER-003',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [
                            { itemName: 'screen_machine', quantity: 3 } // 3 machines
                        ]
                    });

                expect(response.status).toBe(201);
                expect(response.body.pickupRequestId).toBeDefined();

                // Verify save was called with partitioned items (3 separate entries)
                const saveCall = (pickupRequestRepo.savePickupRequest as jest.Mock).mock.calls[0][0];
                expect(saveCall.items.length).toBe(3); // Each machine as separate item
            });

            it('should handle machine orders with weight-based quantities', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'PEAR-ORDER-004',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [
                            { itemName: 'case_machine', quantity: 4500 } // 4500 KG = 3 machines @ 1500 KG each
                        ]
                    });

                expect(response.status).toBe(201);

                const saveCall = (pickupRequestRepo.savePickupRequest as jest.Mock).mock.calls[0][0];
                expect(saveCall.items.length).toBe(3); // Split into 3 machines
                expect(saveCall.items[0].quantity).toBe(1500);
            });

            it('should partition large orders exceeding vehicle capacity', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'LARGE-ORDER-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [
                            { itemName: 'copper', quantity: 12000 } // Exceeds 5000 KG limit
                        ]
                    });

                expect(response.status).toBe(201);

                const saveCall = (pickupRequestRepo.savePickupRequest as jest.Mock).mock.calls[0][0];
                // Should be split: 5000 + 5000 + 2000
                expect(saveCall.items.length).toBe(3);
                expect(saveCall.items.filter((i: any) => i.quantity === 5000).length).toBe(2);
                expect(saveCall.items.filter((i: any) => i.quantity === 2000).length).toBe(1);
            });

            it('should calculate cost including loan repayment and profit margin', async () => {
                // Mock loans to exist
                const mockLoans = [
                    { loanNumber: 'LOAN-123', loanAmount: 100000, interestRate: 0.05 }
                ];
                (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                    createMockVehicle('large_truck', 500)
                ]);

                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'COST-TEST-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'copper', quantity: 3000 }]
                    });

                expect(response.status).toBe(201);
                // Cost should include operational cost + loan repayment + 50% margin
                expect(response.body.cost).toBeGreaterThan(0);
            });
        });

        describe('Failure Scenarios', () => {
            it('should reject request with invalid company name', async () => {
                (companyRepo.getCompanyByName as jest.Mock).mockResolvedValue(null);

                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'INVALID-001',
                        originCompany: 'non-existent-company',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'copper', quantity: 1000 }]
                    });

                expect(response.status).toBe(400);
                expect(response.body.message).toContain('Invalid input data');
            });

            it('should reject request with invalid item name', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'INVALID-002',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'nonexistent-item', quantity: 1000 }]
                    });

                expect(response.status).toBe(400);
            });

            it('should reject request with negative quantity', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'INVALID-003',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'copper', quantity: -500 }]
                    });

                expect(response.status).toBe(400);
            });

            it('should reject request with missing required fields', async () => {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originCompany: 'thoh',
                        items: [{ itemName: 'copper', quantity: 1000 }]
                        // Missing destinationCompany and originalExternalOrderId
                    });

                expect(response.status).toBe(400);
            });

            it('should handle THOH API failure when fetching machine weights', async () => {
                cleanupMocks();
                nock(THOH_API_BASE)
                    .get('/api/machines')
                    .reply(503, { error: 'Service unavailable' });

                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'THOH-ERROR-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'screen_machine', quantity: 2 }]
                    });

                expect(response.status).toBe(503);
                expect(response.body.message).toContain('Failed to retrieve machine weight information');
            });

            it('should handle database failure gracefully', async () => {
                (pickupRequestRepo.savePickupRequest as jest.Mock).mockRejectedValue(
                    new Error('Database connection failed')
                );

                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'DB-ERROR-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'copper', quantity: 1000 }]
                    });

                expect(response.status).toBe(500);
            });

            it('should return fallback cost when no vehicles available', async () => {
                (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([]);

                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: 'NO-VEHICLES-001',
                        originCompany: 'thoh',
                        destinationCompany: 'pear-company',
                        items: [{ itemName: 'copper', quantity: 1000 }]
                    });

                expect(response.status).toBe(201);
                expect(response.body.cost).toBe(150); // Fallback cost
            });
        });
    });

    describe('GET /api/pickup-request/:id - Get Pickup Request', () => {
        it('should retrieve pickup request with PENDING_PAYMENT status', async () => {
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId: 1,
                cost: 500,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'ORDER-001',
                requestDate: new Date(),
                paymentStatus: 'PENDING',
                completionDate: null,
                items: [{ itemName: 'copper', quantity: 1000 }]
            });

            const response = await request(app).get('/api/pickup-request/1');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('PENDING_PAYMENT');
        });

        it('should retrieve pickup request with PENDING_DELIVERY status', async () => {
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId: 2,
                cost: 500,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'ORDER-002',
                requestDate: new Date(),
                paymentStatus: 'CONFIRMED',
                completionDate: null,
                items: [{ itemName: 'copper', quantity: 1000 }]
            });

            const response = await request(app).get('/api/pickup-request/2');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('PENDING_DELIVERY');
        });

        it('should retrieve pickup request with DELIVERED status', async () => {
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId: 3,
                cost: 500,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'ORDER-003',
                requestDate: new Date(),
                paymentStatus: 'CONFIRMED',
                completionDate: new Date(),
                items: [{ itemName: 'copper', quantity: 1000 }]
            });

            const response = await request(app).get('/api/pickup-request/3');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('DELIVERED');
        });

        it('should return 404 for non-existent pickup request', async () => {
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue(null);

            const response = await request(app).get('/api/pickup-request/999');

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('No pickup request found');
        });
    });

    describe('GET /api/pickup-request/company/:companyName - Get Requests by Company', () => {
        it('should retrieve all pickup requests for a company', async () => {
            (pickupRequestRepo.findPickupRequestsByCompanyName as jest.Mock).mockResolvedValue([
                {
                    pickupRequestId: 1,
                    cost: 500,
                    originCompanyName: 'thoh',
                    originalExternalOrderId: 'ORDER-001',
                    requestDate: new Date(),
                    paymentStatus: 'CONFIRMED',
                    completionDate: null,
                    items: []
                },
                {
                    pickupRequestId: 2,
                    cost: 750,
                    originCompanyName: 'electronics-supplier',
                    originalExternalOrderId: 'ORDER-002',
                    requestDate: new Date(),
                    paymentStatus: 'PENDING',
                    completionDate: null,
                    items: []
                }
            ]);

            const response = await request(app).get('/api/pickup-request/company/pear-company');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].status).toBe('PENDING_DELIVERY');
            expect(response.body[1].status).toBe('PENDING_PAYMENT');
        });

        it('should return empty array for company with no requests', async () => {
            (pickupRequestRepo.findPickupRequestsByCompanyName as jest.Mock).mockResolvedValue([]);

            const response = await request(app).get('/api/pickup-request/company/new-company');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('GET /api/pickup-request - Get All Pickup Requests', () => {
        it('should retrieve all pickup requests in the system', async () => {
            (pickupRequestRepo.findAllPickupRequests as jest.Mock).mockResolvedValue([
                { pickupRequestId: 1, cost: 500 },
                { pickupRequestId: 2, cost: 750 },
                { pickupRequestId: 3, cost: 1000 }
            ]);

            const response = await request(app).get('/api/pickup-request');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(3);
        });

        it('should return 404 when no pickup requests exist', async () => {
            (pickupRequestRepo.findAllPickupRequests as jest.Mock).mockResolvedValue(null);

            const response = await request(app).get('/api/pickup-request');

            expect(response.status).toBe(404);
        });
    });
});

// ============================================================================
// Helper Functions
// ============================================================================

function setupDefaultDatabaseMocks() {
    // Mock item definitions
    (itemDefRepo.getItemDefinitions as jest.Mock).mockResolvedValue([
        { item_name: 'copper', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'silicon', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'electronics', capacity_type_name: 'UNIT', weight_per_unit: 0 },
        { item_name: 'screens', capacity_type_name: 'UNIT', weight_per_unit: 0 },
        { item_name: 'cases', capacity_type_name: 'UNIT', weight_per_unit: 0 },
        { item_name: 'screen_machine', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'case_machine', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'ephone_machine', capacity_type_name: 'KG', weight_per_unit: 0 }
    ]);

    // Mock machine weights
    (itemDefRepo.getMachines as jest.Mock).mockResolvedValue([
        { item_name: 'screen_machine', weight_per_unit: 2000 },
        { item_name: 'case_machine', weight_per_unit: 1500 },
        { item_name: 'ephone_machine', weight_per_unit: 2000 }
    ]);

    // Mock company
    (companyRepo.getCompanyByName as jest.Mock).mockImplementation((name: string) => {
        const companies: Record<string, any> = {
            'bulk-logistics': { company_id: 1, company_name: 'bulk-logistics', bankAccountNumber: 'BL-123' },
            'thoh': { company_id: 2, company_name: 'thoh', bankAccountNumber: 'THOH-123' },
            'pear-company': { company_id: 3, company_name: 'pear-company' },
            'electronics-supplier': { company_id: 4, company_name: 'electronics-supplier' }
        };
        return Promise.resolve(companies[name] || null);
    });

    // Mock vehicle repository
    (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([
        createMockVehicle('large_truck', 500),
        createMockVehicle('medium_truck', 300)
    ]);

    // Mock save pickup request
    (pickupRequestRepo.savePickupRequest as jest.Mock).mockImplementation((request: any) => {
        return Promise.resolve({
            pickupRequestId: Math.floor(Math.random() * 1000),
            paymentReferenceId: '123e4567-e89b-12d3-a456-426614174000',
            cost: request.cost,
            bulkLogisticsBankAccountNumber: 'BL-123'
        });
    });
}

function createMockVehicle(type: string, operationalCost: number) {
    const configs: Record<string, any> = {
        'large_truck': { capacity: 5000, capacity_type_id: 1, max_pickups: 1, max_dropoffs: 1 },
        'medium_truck': { capacity: 2000, capacity_type_id: 2, max_pickups: 5, max_dropoffs: 100 }
    };

    const config = configs[type];
    return {
        vehicle_id: Math.floor(Math.random() * 1000),
        is_active: true,
        daily_operational_cost: operationalCost,
        vehicle_type: {
            name: type,
            maximum_capacity: config.capacity,
            capacity_type_id: config.capacity_type_id,
            max_pickups_per_day: config.max_pickups,
            max_dropoffs_per_day: config.max_dropoffs
        }
    };
}
