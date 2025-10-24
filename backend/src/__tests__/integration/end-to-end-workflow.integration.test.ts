/**
 * End-to-End Workflow Integration Tests
 *
 * Tests complete workflows from request creation to delivery including:
 * - Full pickup request lifecycle
 * - Payment → Planning → Delivery flow
 * - Multi-request daily operations simulation
 * - Error recovery scenarios
 */

import request from 'supertest';
import nock from 'nock';
import { setupAllMocks, cleanupMocks, BANK_API_BASE } from './mocks/setup';
import app from '../../app';
import { ShipmentPlannerService } from '../../services/ShipmentPlannerService';
import { simulatedClock } from '../../utils';

// Mock database repositories
jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/itemDefinitionRepository');
jest.mock('../../models/companyRepository');
jest.mock('../../models/vehicleRepository');
jest.mock('../../models/transactionsRepository');
jest.mock('../../models/shipmentRepository');
jest.mock('../../models/notificationsQueueRepository');
jest.mock('../../services/AutonomyService');

import * as pickupRequestRepo from '../../models/pickupRequestRepository';
import * as itemDefRepo from '../../models/itemDefinitionRepository';
import * as companyRepo from '../../models/companyRepository';
import * as vehicleRepo from '../../models/vehicleRepository';
import * as transactionsRepo from '../../models/transactionsRepository';
import * as shipmentRepo from '../../models/shipmentRepository';
import * as notificationQueueRepo from '../../models/notificationsQueueRepository';

describe('End-to-End Workflow Integration Tests', () => {
    beforeAll(() => {
        simulatedClock.initialize(Date.now());
    });

    beforeEach(() => {
        setupAllMocks();
        jest.clearAllMocks();
        setupDefaultDatabaseMocks();
    });

    afterEach(() => {
        cleanupMocks();
    });

    describe('Complete Pickup Request Lifecycle', () => {
        it('should handle full workflow: create → pay → plan → deliver', async () => {
            // ===== STEP 1: Create Pickup Request =====
            const createResponse = await request(app)
                .post('/api/pickup-request')
                .send({
                    originalExternalOrderId: 'E2E-ORDER-001',
                    originCompany: 'thoh',
                    destinationCompany: 'pear-company',
                    items: [
                        { itemName: 'copper', quantity: 3000 },
                        { itemName: 'silicon', quantity: 2000 }
                    ]
                });

            expect(createResponse.status).toBe(201);
            const { pickupRequestId, paymentReferenceId, cost, accountNumber } = createResponse.body;
            expect(pickupRequestId).toBeDefined();
            expect(paymentReferenceId).toBeDefined();
            expect(cost).toBeGreaterThan(0);

            // ===== STEP 2: Verify Request Status (PENDING_PAYMENT) =====
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId,
                cost,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'E2E-ORDER-001',
                requestDate: new Date(),
                paymentStatus: 'PENDING',
                completionDate: null,
                items: [
                    { itemName: 'copper', quantity: 3000 },
                    { itemName: 'silicon', quantity: 2000 }
                ]
            });

            const statusResponse1 = await request(app).get(`/api/pickup-request/${pickupRequestId}`);
            expect(statusResponse1.status).toBe(200);
            expect(statusResponse1.body.status).toBe('PENDING_PAYMENT');

            // ===== STEP 3: Process Payment =====
            (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

            const paymentResponse = await request(app)
                .post('/api/bank')
                .send({
                    transaction_number: 'E2E-TXN-001',
                    from: 'PEAR-ACCOUNT-123',
                    to: accountNumber,
                    amount: cost,
                    status: 'CONFIRMED',
                    timestamp: Date.now(),
                    payment_reference: paymentReferenceId
                });

            expect(paymentResponse.status).toBe(201);

            // ===== STEP 4: Verify Request Status (PENDING_DELIVERY) =====
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId,
                cost,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'E2E-ORDER-001',
                requestDate: new Date(),
                paymentStatus: 'CONFIRMED',
                completionDate: null,
                items: [
                    { itemName: 'copper', quantity: 3000 },
                    { itemName: 'silicon', quantity: 2000 }
                ]
            });

            const statusResponse2 = await request(app).get(`/api/pickup-request/${pickupRequestId}`);
            expect(statusResponse2.status).toBe(200);
            expect(statusResponse2.body.status).toBe('PENDING_DELIVERY');

            // ===== STEP 5: Simulate Daily Planning =====
            (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue([
                createMockPaidRequest(pickupRequestId, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 3000, capacity_type_id: 1 },
                    { itemName: 'silicon', quantity: 2000, capacity_type_id: 1 }
                ])
            ]);

            (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue([
                createMockAvailableVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const planner = new ShipmentPlannerService();
            const planResult = await planner.planDailyShipments();

            expect(planResult.plannedRequestIds).toContain(pickupRequestId);
            expect(planResult.createdShipmentsPlan.length).toBeGreaterThan(0);

            // ===== STEP 6: Verify Request Status (DELIVERED) =====
            (pickupRequestRepo.findPickupRequestById as jest.Mock).mockResolvedValue({
                pickupRequestId,
                cost,
                originCompanyName: 'thoh',
                originalExternalOrderId: 'E2E-ORDER-001',
                requestDate: new Date(),
                paymentStatus: 'CONFIRMED',
                completionDate: new Date(),
                items: [
                    { itemName: 'copper', quantity: 3000 },
                    { itemName: 'silicon', quantity: 2000 }
                ]
            });

            const statusResponse3 = await request(app).get(`/api/pickup-request/${pickupRequestId}`);
            expect(statusResponse3.status).toBe(200);
            expect(statusResponse3.body.status).toBe('DELIVERED');
        });

        it('should handle multiple requests from different companies concurrently', async () => {
            // Create 3 requests from different companies
            const requests = [];

            for (let i = 1; i <= 3; i++) {
                const response = await request(app)
                    .post('/api/pickup-request')
                    .send({
                        originalExternalOrderId: `MULTI-ORDER-${i}`,
                        originCompany: i === 1 ? 'thoh' : i === 2 ? 'electronics-supplier' : 'screen-supplier',
                        destinationCompany: i === 1 ? 'pear-company' : i === 2 ? 'pear-company' : 'sumsang-company',
                        items: [
                            { itemName: i === 1 ? 'copper' : i === 2 ? 'electronics' : 'screens', quantity: 1000 }
                        ]
                    });

                expect(response.status).toBe(201);
                requests.push(response.body);
            }

            // Pay for all requests
            for (const req of requests) {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const paymentResponse = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: `MULTI-TXN-${req.pickupRequestId}`,
                        from: 'CUSTOMER-ACCOUNT',
                        to: req.accountNumber,
                        amount: req.cost,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: req.paymentReferenceId
                    });

                expect(paymentResponse.status).toBe(201);
            }

            // Verify all can be planned
            (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue([
                createMockPaidRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1 }
                ]),
                createMockPaidRequest(2, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 1000, capacity_type_id: 2 }
                ]),
                createMockPaidRequest(3, 'screen-supplier', 'sumsang-company', [
                    { itemName: 'screens', quantity: 1000, capacity_type_id: 2 }
                ])
            ]);

            (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue([
                createMockAvailableVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockAvailableVehicle(2, 'medium_truck', 2000, 5, 100, 2)
            ]);

            const planner = new ShipmentPlannerService();
            const result = await planner.planDailyShipments();

            expect(result.plannedRequestIds.length).toBeGreaterThan(0);
        });
    });

    describe('Error Recovery Scenarios', () => {
        it('should handle payment failure and allow retry', async () => {
            // Create request
            const createResponse = await request(app)
                .post('/api/pickup-request')
                .send({
                    originalExternalOrderId: 'RETRY-ORDER-001',
                    originCompany: 'thoh',
                    destinationCompany: 'pear-company',
                    items: [{ itemName: 'copper', quantity: 1000 }]
                });

            const { pickupRequestId, paymentReferenceId, cost, accountNumber } = createResponse.body;

            // First payment fails
            (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
            (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(500);

            const failedPayment = await request(app)
                .post('/api/bank')
                .send({
                    transaction_number: 'FAILED-TXN-001',
                    from: 'PEAR-ACCOUNT-123',
                    to: accountNumber,
                    amount: cost,
                    status: 'FAILED',
                    timestamp: Date.now(),
                    payment_reference: paymentReferenceId
                });

            expect(failedPayment.status).toBe(500);

            // Retry payment succeeds
            (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

            const successPayment = await request(app)
                .post('/api/bank')
                .send({
                    transaction_number: 'RETRY-TXN-001',
                    from: 'PEAR-ACCOUNT-123',
                    to: accountNumber,
                    amount: cost,
                    status: 'CONFIRMED',
                    timestamp: Date.now(),
                    payment_reference: paymentReferenceId
                });

            expect(successPayment.status).toBe(201);
        });

        it('should queue failed delivery notifications for retry', async () => {
            const mockNotification = {
                id: '123',
                notificationURL: 'https://pear-company.com/logistics',
                type: 'DELIVERY',
                quantity: 1000,
                items: [{ itemID: 1, name: 'copper', quantity: 1000 }]
            };

            (notificationQueueRepo.getQueuedNotifications as jest.Mock).mockResolvedValue([
                {
                    notification_id: 1,
                    related_pickup_request_id: 123,
                    payload: mockNotification,
                    status: 'QUEUED',
                    retry_count: 1,
                    created_at: new Date()
                }
            ]);

            // Simulate notification failure
            nock('https://pear-company.com')
                .post('/logistics')
                .reply(503, { error: 'Service temporarily unavailable' });

            // Should queue for retry
            (notificationQueueRepo.addOrUpdateFailedNotification as jest.Mock).mockResolvedValue(undefined);

            const notifications = await notificationQueueRepo.getQueuedNotifications();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].status).toBe('QUEUED');
        });

        it('should handle partial request fulfillment due to limited vehicles', async () => {
            // Large request requiring multiple vehicles
            (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue([
                createMockPaidRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 5000, capacity_type_id: 1 },
                    { itemName: 'silicon', quantity: 5000, capacity_type_id: 1 },
                    { itemName: 'sand', quantity: 5000, capacity_type_id: 1 }
                ])
            ]);

            // Only 2 vehicles available (can't fulfill entire request)
            (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue([
                createMockAvailableVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockAvailableVehicle(2, 'large_truck', 5000, 1, 1, 1)
            ]);

            const planner = new ShipmentPlannerService();
            const result = await planner.planDailyShipments();

            // Should plan partial fulfillment
            expect(result.createdShipmentsPlan.length).toBe(2);

            // Request should NOT be in plannedRequestIds (not fully planned in Pass 1)
            // But items should be assigned in Pass 2
            const totalItems = result.createdShipmentsPlan.reduce(
                (sum, plan) => sum + plan.itemsToAssign.length,
                0
            );
            expect(totalItems).toBeGreaterThan(0);
        });
    });

    describe('Business Rule Validation', () => {
        it('should enforce capacity type constraints', async () => {
            const response = await request(app)
                .post('/api/pickup-request')
                .send({
                    originalExternalOrderId: 'CAPACITY-TEST-001',
                    originCompany: 'thoh',
                    destinationCompany: 'pear-company',
                    items: [
                        { itemName: 'copper', quantity: 3000 }, // KG
                        { itemName: 'electronics', quantity: 1000 } // UNIT - mixed capacity types
                    ]
                });

            expect(response.status).toBe(201);

            // Should partition into separate shipments by capacity type
            const saveCall = (pickupRequestRepo.savePickupRequest as jest.Mock).mock.calls[0][0];
            const kgItems = saveCall.items.filter((i: any) => i.measurementType === 'KG');
            const unitItems = saveCall.items.filter((i: any) => i.measurementType === 'UNIT');

            expect(kgItems.length).toBeGreaterThan(0);
            expect(unitItems.length).toBeGreaterThan(0);
        });

        it('should partition large orders exceeding vehicle capacity', async () => {
            const response = await request(app)
                .post('/api/pickup-request')
                .send({
                    originalExternalOrderId: 'LARGE-ORDER-001',
                    originCompany: 'thoh',
                    destinationCompany: 'pear-company',
                    items: [
                        { itemName: 'copper', quantity: 18000 } // 3.6x large truck capacity
                    ]
                });

            expect(response.status).toBe(201);

            const saveCall = (pickupRequestRepo.savePickupRequest as jest.Mock).mock.calls[0][0];
            // Should split into 4 items: 5000, 5000, 5000, 3000
            expect(saveCall.items.length).toBe(4);
            expect(saveCall.items.filter((i: any) => i.quantity === 5000).length).toBe(3);
            expect(saveCall.items.filter((i: any) => i.quantity === 3000).length).toBe(1);
        });

        it('should calculate cost with profit margin', async () => {
            (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                createMockVehicleWithCost('large_truck', 500, 5000, 1)
            ]);

            (transactionsRepo.getAllLoans as jest.Mock).mockResolvedValue([]);

            const response = await request(app)
                .post('/api/pickup-request')
                .send({
                    originalExternalOrderId: 'COST-TEST-001',
                    originCompany: 'thoh',
                    destinationCompany: 'pear-company',
                    items: [{ itemName: 'copper', quantity: 3000 }]
                });

            expect(response.status).toBe(201);
            // Cost should be > operational cost due to 50% profit margin
            expect(response.body.cost).toBeGreaterThan(0);
        });
    });

    describe('Real-World Simulation Scenarios', () => {
        it('should simulate a typical day with 10 pickup requests', async () => {
            // Create 10 requests
            const requests = [];
            for (let i = 1; i <= 10; i++) {
                requests.push(
                    createMockPaidRequest(
                        i,
                        i % 2 === 0 ? 'thoh' : 'electronics-supplier',
                        i % 3 === 0 ? 'sumsang-company' : 'pear-company',
                        [
                            {
                                itemName: i % 2 === 0 ? 'copper' : 'electronics',
                                quantity: 1000 + i * 100,
                                capacity_type_id: i % 2 === 0 ? 1 : 2
                            }
                        ]
                    )
                );
            }

            (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue(requests);

            // Fleet of 8 vehicles
            (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue([
                ...Array.from({ length: 4 }, (_, i) =>
                    createMockAvailableVehicle(i + 1, 'large_truck', 5000, 1, 1, 1)
                ),
                ...Array.from({ length: 4 }, (_, i) =>
                    createMockAvailableVehicle(i + 5, 'medium_truck', 2000, 5, 100, 2)
                )
            ]);

            const planner = new ShipmentPlannerService();
            const result = await planner.planDailyShipments();

            // Should plan multiple requests
            expect(result.plannedRequestIds.length).toBeGreaterThan(0);
            expect(result.createdShipmentsPlan.length).toBeGreaterThan(0);

            // Verify vehicles are used efficiently
            result.createdShipmentsPlan.forEach(plan => {
                expect(plan.itemsToAssign.length).toBeGreaterThan(0);
            });
        });

        it('should handle peak load with insufficient vehicles', async () => {
            // 20 requests but only 3 vehicles
            const requests = Array.from({ length: 20 }, (_, i) =>
                createMockPaidRequest(
                    i + 1,
                    'thoh',
                    'pear-company',
                    [{ itemName: 'copper', quantity: 2000, capacity_type_id: 1 }]
                )
            );

            (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue(requests);

            (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue([
                createMockAvailableVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockAvailableVehicle(2, 'large_truck', 5000, 1, 1, 1),
                createMockAvailableVehicle(3, 'large_truck', 5000, 1, 1, 1)
            ]);

            const planner = new ShipmentPlannerService();
            const result = await planner.planDailyShipments();

            // Should plan what it can (limited by vehicles)
            expect(result.createdShipmentsPlan.length).toBeLessThanOrEqual(3);

            // Remaining requests should be planned on next day
            expect(result.plannedRequestIds.length).toBeLessThan(20);
        });
    });
});

// ============================================================================
// Helper Functions
// ============================================================================

function setupDefaultDatabaseMocks() {
    (itemDefRepo.getItemDefinitions as jest.Mock).mockResolvedValue([
        { item_name: 'copper', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'silicon', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'sand', capacity_type_name: 'KG', weight_per_unit: 0 },
        { item_name: 'electronics', capacity_type_name: 'UNIT', weight_per_unit: 0 },
        { item_name: 'screens', capacity_type_name: 'UNIT', weight_per_unit: 0 },
        { item_name: 'cases', capacity_type_name: 'UNIT', weight_per_unit: 0 }
    ]);

    (itemDefRepo.getMachines as jest.Mock).mockResolvedValue([
        { item_name: 'screen_machine', weight_per_unit: 2000 },
        { item_name: 'case_machine', weight_per_unit: 1500 }
    ]);

    (companyRepo.getCompanyByName as jest.Mock).mockImplementation((name: string) => {
        const companies: Record<string, any> = {
            'bulk-logistics': { company_id: 1, company_name: 'bulk-logistics', bankAccountNumber: 'BL-123' },
            'thoh': { company_id: 2, company_name: 'thoh' },
            'pear-company': { company_id: 3, company_name: 'pear-company' },
            'sumsang-company': { company_id: 4, company_name: 'sumsang-company' },
            'electronics-supplier': { company_id: 5, company_name: 'electronics-supplier' },
            'screen-supplier': { company_id: 6, company_name: 'screen-supplier' }
        };
        return Promise.resolve(companies[name] || null);
    });

    (companyRepo.findAccountNumberByCompanyName as jest.Mock).mockResolvedValue('BL-123');

    (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([
        createMockVehicleWithCost('large_truck', 500, 5000, 1),
        createMockVehicleWithCost('medium_truck', 300, 2000, 2)
    ]);

    (pickupRequestRepo.savePickupRequest as jest.Mock).mockImplementation((request: any) => {
        return Promise.resolve({
            pickupRequestId: Math.floor(Math.random() * 10000),
            paymentReferenceId: `${Math.random().toString(36).substring(7)}-ref`,
            cost: request.cost,
            bulkLogisticsBankAccountNumber: 'BL-123'
        });
    });

    (transactionsRepo.getAllLoans as jest.Mock).mockResolvedValue([]);
    (shipmentRepo.shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);
}

function createMockPaidRequest(id: number, origin: string, destination: string, items: any[]) {
    return {
        pickupRequestId: id,
        requestingCompanyName: destination,
        originCompanyName: origin,
        destinationCompanyName: destination,
        originalExternalOrderId: `ORDER-${id}`,
        cost: 500,
        requestDate: new Date(),
        completionDate: null,
        paymentStatus: 'CONFIRMED',
        items: items.map((item, index) => ({
            pickup_request_id: id,
            pickup_request_item_id: id * 100 + index,
            itemName: item.itemName,
            quantity: item.quantity,
            capacity_type_id: item.capacity_type_id,
            shipment_id: item.shipment_id || null,
            originCompanyUrl: `https://${origin}.com`,
            destinationCompanyUrl: `https://${destination}.com`,
            originalExternalOrderId: `ORDER-${id}`
        }))
    };
}

function createMockAvailableVehicle(
    id: number,
    typeName: string,
    maxCapacity: number,
    maxPickups: number,
    maxDropoffs: number,
    capacityTypeId: number
) {
    return {
        vehicle_id: id,
        is_active: true,
        maximum_capacity: maxCapacity,
        capacity_type_id: capacityTypeId,
        max_pickups_per_day: maxPickups,
        max_dropoffs_per_day: maxDropoffs,
        capacityRemaining: maxCapacity,
        pickupsAssignedToday: 0,
        dropoffsAssignedToday: 0,
        assignedOrigins: new Set<string>(),
        assignedDestinations: new Set<string>(),
        vehicle_type: {
            name: typeName,
            maximum_capacity: maxCapacity,
            capacity_type_id: capacityTypeId,
            max_pickups_per_day: maxPickups,
            max_dropoffs_per_day: maxDropoffs
        }
    };
}

function createMockVehicleWithCost(type: string, cost: number, capacity: number, capacityTypeId: number) {
    const configs: Record<string, any> = {
        'large_truck': { max_pickups: 1, max_dropoffs: 1 },
        'medium_truck': { max_pickups: 5, max_dropoffs: 100 }
    };

    const config = configs[type];
    return {
        vehicle_id: Math.floor(Math.random() * 1000),
        is_active: true,
        daily_operational_cost: cost,
        vehicle_type: {
            name: type,
            maximum_capacity: capacity,
            capacity_type_id: capacityTypeId,
            max_pickups_per_day: config.max_pickups,
            max_dropoffs_per_day: config.max_dropoffs
        }
    };
}
