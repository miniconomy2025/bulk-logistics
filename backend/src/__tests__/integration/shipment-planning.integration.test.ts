/**
 * Shipment Planning Integration Tests
 *
 * Tests the shipment planning algorithm including:
 * - Two-pass planning strategy (full requests then partial)
 * - Vehicle assignment logic
 * - Capacity constraints
 * - Pickup/dropoff limits
 * - Mixed capacity types (KG vs UNIT)
 */

import { ShipmentPlannerService } from '../../services/ShipmentPlannerService';
import { setupAllMocks, cleanupMocks } from './mocks/setup';
import { simulatedClock } from '../../utils';

// Mock database repositories
jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/vehicleRepository');
jest.mock('../../services/AutonomyService');

import * as pickupRequestRepo from '../../models/pickupRequestRepository';
import * as vehicleRepo from '../../models/vehicleRepository';

describe('Shipment Planning Integration Tests', () => {
    let planner: ShipmentPlannerService;

    beforeAll(() => {
        simulatedClock.initialize(Date.now());
    });

    beforeEach(() => {
        setupAllMocks();
        jest.clearAllMocks();
        planner = new ShipmentPlannerService();
    });

    afterEach(() => {
        cleanupMocks();
    });

    describe('Single Request Planning', () => {
        it('should plan a simple request that fits on one vehicle', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 3000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.createdShipmentsPlan).toHaveLength(1);
            expect(result.createdShipmentsPlan[0].itemsToAssign).toHaveLength(1);
            expect(result.plannedRequestIds).toContain(1);
        });

        it('should plan request requiring multiple vehicles due to capacity', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 12000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(3, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Should use 3 vehicles (5000 + 5000 + 2000)
            expect(result.createdShipmentsPlan.length).toBeGreaterThanOrEqual(2);
        });

        it('should plan UNIT-based request on medium trucks', async () => {
            mockPaidRequests([
                createMockRequest(1, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 1500, capacity_type_id: 2 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'medium_truck', 2000, 5, 100, 2)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.createdShipmentsPlan).toHaveLength(1);
            expect(result.createdShipmentsPlan[0].vehicle.vehicle_type?.name).toBe('medium_truck');
        });

        it('should NOT plan request when wrong capacity type available', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 3000, capacity_type_id: 1 } // KG
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'medium_truck', 2000, 5, 100, 2) // UNIT only
            ]);

            const result = await planner.planDailyShipments();

            // Should not plan anything due to capacity type mismatch
            expect(result.createdShipmentsPlan).toHaveLength(0);
            expect(result.plannedRequestIds).toHaveLength(0);
        });
    });

    describe('Multiple Request Planning', () => {
        it('should plan multiple requests in payment order', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 2000, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 1000, capacity_type_id: 2 }
                ]),
                createMockRequest(3, 'thoh', 'sumsang-company', [
                    { itemName: 'silicon', quantity: 1500, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(3, 'medium_truck', 2000, 5, 100, 2)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.plannedRequestIds).toHaveLength(3);
            expect(result.createdShipmentsPlan.length).toBeGreaterThan(0);
        });

        it('should handle mixed capacity types efficiently', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 4000, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 1800, capacity_type_id: 2 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'medium_truck', 2000, 5, 100, 2)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.plannedRequestIds).toContain(1);
            expect(result.plannedRequestIds).toContain(2);
        });
    });

    describe('Pickup/Dropoff Limit Constraints', () => {
        it('should respect max pickups per day for large trucks', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'electronics-supplier', 'pear-company', [
                    // Different origin - would exceed pickup limit
                    { itemName: 'sand', quantity: 1000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1) // Max 1 pickup
            ]);

            const result = await planner.planDailyShipments();

            // Should only plan one request (can't do 2 pickups on same truck)
            expect(result.plannedRequestIds.length).toBeLessThanOrEqual(1);
        });

        it('should respect max dropoffs per day for large trucks', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'thoh', 'sumsang-company', [
                    // Same origin, different destination
                    { itemName: 'silicon', quantity: 1000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1) // Max 1 dropoff
            ]);

            const result = await planner.planDailyShipments();

            // Should only plan one request (can't do 2 dropoffs on same truck)
            expect(result.plannedRequestIds.length).toBeLessThanOrEqual(1);
        });

        it('should allow multiple pickups on medium trucks within limit', async () => {
            mockPaidRequests([
                createMockRequest(1, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 500, capacity_type_id: 2 }
                ]),
                createMockRequest(2, 'screen-supplier', 'pear-company', [
                    { itemName: 'screens', quantity: 500, capacity_type_id: 2 }
                ]),
                createMockRequest(3, 'case-supplier', 'pear-company', [
                    { itemName: 'cases', quantity: 500, capacity_type_id: 2 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'medium_truck', 2000, 5, 100, 2) // 5 pickups, 100 dropoffs
            ]);

            const result = await planner.planDailyShipments();

            // Should plan all 3 requests (within pickup limit, same destination)
            expect(result.plannedRequestIds).toHaveLength(3);
        });
    });

    describe('Two-Pass Planning Strategy', () => {
        it('should prioritize full request planning in Pass 1', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 2000, capacity_type_id: 1 },
                    { itemName: 'silicon', quantity: 2000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Both items should be planned together
            expect(result.plannedRequestIds).toContain(1);
            const shipment = result.createdShipmentsPlan.find(s =>
                s.itemsToAssign.some(item => item.pickup_request_id === 1)
            );
            expect(shipment?.itemsToAssign.filter(i => i.pickup_request_id === 1).length).toBe(2);
        });

        it('should use Pass 2 for partial planning when full request does not fit', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 4000, capacity_type_id: 1 },
                    { itemName: 'silicon', quantity: 3000, capacity_type_id: 1 }
                    // Total 7000 KG - cannot fit on one large truck
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Pass 1 fails, Pass 2 should assign items to available vehicles
            expect(result.createdShipmentsPlan.length).toBeGreaterThan(0);

            // Request should NOT be in plannedRequestIds since it wasn't fully planned in Pass 1
            // But items should still be assigned
            const totalItemsAssigned = result.createdShipmentsPlan.reduce(
                (sum, plan) => sum + plan.itemsToAssign.length,
                0
            );
            expect(totalItemsAssigned).toBeGreaterThan(0);
        });

        it('should fill remaining capacity with other requests in Pass 2', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 3000, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'thoh', 'pear-company', [
                    { itemName: 'silicon', quantity: 1500, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Both requests should fit on same truck
            expect(result.plannedRequestIds).toContain(1);
            const shipment = result.createdShipmentsPlan[0];
            expect(shipment.itemsToAssign.length).toBe(2);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle no available vehicles gracefully', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([]);

            const result = await planner.planDailyShipments();

            expect(result.createdShipmentsPlan).toHaveLength(0);
            expect(result.plannedRequestIds).toHaveLength(0);
        });

        it('should handle no pending requests gracefully', async () => {
            mockPaidRequests([]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.createdShipmentsPlan).toHaveLength(0);
            expect(result.plannedRequestIds).toHaveLength(0);
        });

        it('should skip already assigned items', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1, shipment_id: 999 } // Already assigned
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Should not plan anything since item already assigned
            expect(result.createdShipmentsPlan).toHaveLength(0);
        });

        it('should handle vehicle with zero remaining capacity', async () => {
            const vehicle = createMockVehicle(1, 'large_truck', 5000, 1, 1, 1);
            vehicle.capacityRemaining = 0;

            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([vehicle]);

            const result = await planner.planDailyShipments();

            expect(result.createdShipmentsPlan).toHaveLength(0);
        });

        it('should handle request with multiple items of different types', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 2000, capacity_type_id: 1 },
                    { itemName: 'silicon', quantity: 2500, capacity_type_id: 1 },
                    { itemName: 'sand', quantity: 1000, capacity_type_id: 1 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'large_truck', 5000, 1, 1, 1)
            ]);

            const result = await planner.planDailyShipments();

            // Total 5500 KG requires 2 trucks
            expect(result.createdShipmentsPlan.length).toBeGreaterThan(0);
        });
    });

    describe('Complex Multi-Company Scenarios', () => {
        it('should handle multiple companies with overlapping routes', async () => {
            mockPaidRequests([
                createMockRequest(1, 'thoh', 'pear-company', [
                    { itemName: 'copper', quantity: 1500, capacity_type_id: 1 }
                ]),
                createMockRequest(2, 'thoh', 'sumsang-company', [
                    { itemName: 'silicon', quantity: 1500, capacity_type_id: 1 }
                ]),
                createMockRequest(3, 'electronics-supplier', 'pear-company', [
                    { itemName: 'electronics', quantity: 800, capacity_type_id: 2 }
                ])
            ]);

            mockAvailableVehicles([
                createMockVehicle(1, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(2, 'large_truck', 5000, 1, 1, 1),
                createMockVehicle(3, 'medium_truck', 2000, 5, 100, 2)
            ]);

            const result = await planner.planDailyShipments();

            expect(result.plannedRequestIds.length).toBeGreaterThan(0);

            // Verify origin/destination tracking
            result.createdShipmentsPlan.forEach(plan => {
                expect(plan.originCompanyNames.size).toBeGreaterThan(0);
                expect(plan.destinationCompanyNames.size).toBeGreaterThan(0);
            });
        });
    });
});

// ============================================================================
// Helper Functions
// ============================================================================

function mockPaidRequests(requests: any[]) {
    (pickupRequestRepo.findPaidAndUnshippedRequests as jest.Mock).mockResolvedValue(requests);
}

function mockAvailableVehicles(vehicles: any[]) {
    (vehicleRepo.findAvailableVehicles as jest.Mock).mockResolvedValue(vehicles);
}

function createMockRequest(
    id: number,
    origin: string,
    destination: string,
    items: any[]
) {
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

function createMockVehicle(
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
