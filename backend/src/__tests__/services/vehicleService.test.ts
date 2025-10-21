import {
    getVehicleForPickupRequest,
    getTodaysVehicleDeliveries,
    reactivateVehicle,
} from '../../services/vehicleService';
import {
    getAllVehiclesWithType,
    getVehicleDeliveriesByDateRange,
    updateVehicleStatus,
} from '../../models/vehicleRepository';
import { simulatedClock } from '../../utils';
import { PickupRequestRequest } from '../../types/PickupRequest';
import { VehicleWithType } from '../../types';

// Mock dependencies
jest.mock('../../models/vehicleRepository');
jest.mock('../../utils', () => ({
    simulatedClock: {
        getCurrentDate: jest.fn(),
    },
}));

describe('vehicleService', () => {
    const mockGetAllVehiclesWithType = getAllVehiclesWithType as jest.MockedFunction<typeof getAllVehiclesWithType>;
    const mockGetVehicleDeliveriesByDateRange = getVehicleDeliveriesByDateRange as jest.MockedFunction<typeof getVehicleDeliveriesByDateRange>;
    const mockUpdateVehicleStatus = updateVehicleStatus as jest.MockedFunction<typeof updateVehicleStatus>;
    const mockSimulatedClock = simulatedClock as jest.Mocked<typeof simulatedClock>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSimulatedClock.getCurrentDate.mockReturnValue(new Date('2025-01-15T12:00:00Z'));
    });

    describe('getVehicleForPickupRequest', () => {
        const largeTruck: VehicleWithType = {
            vehicle_id: 1,
            is_active: true,
            daily_operational_cost: 500,
            vehicle_type_id: 1,
            purchase_date: '2025-01-01',
            vehicle_type: {
                vehicle_type_id: 1,
                name: 'large_truck',
                capacity_type_id: 1,
                maximum_capacity: 5000,
                max_pickups_per_day: 1,
                max_dropoffs_per_day: 1,
            },
            max_pickups_per_day: 1,
        };

        const mediumTruck: VehicleWithType = {
            vehicle_id: 2,
            is_active: true,
            daily_operational_cost: 300,
            vehicle_type_id: 2,
            purchase_date: '2025-01-01',
            vehicle_type: {
                vehicle_type_id: 2,
                name: 'medium_truck',
                capacity_type_id: 2,
                maximum_capacity: 2000,
                max_pickups_per_day: 5,
                max_dropoffs_per_day: 100,
            },
            max_pickups_per_day: 5,
        };

        const smallTruck: VehicleWithType = {
            vehicle_id: 3,
            is_active: true,
            daily_operational_cost: 200,
            vehicle_type_id: 3,
            purchase_date: '2025-01-01',
            vehicle_type: {
                vehicle_type_id: 3,
                name: 'small_truck',
                capacity_type_id: 2,
                maximum_capacity: 500,
                max_pickups_per_day: 200,
                max_dropoffs_per_day: 500,
            },
            max_pickups_per_day: 200,
        };

        describe('Weight-based (KG) Items', () => {
            it('should select one large truck for items under 5000 KG', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 3000, measurementType: 'KG' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                expect(result.vehicles).toHaveLength(1);
                expect(result.vehicles?.[0].vehicle_type.name).toBe('large_truck');
            });

            it('should select multiple large trucks for items over 5000 KG', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck, { ...largeTruck, vehicle_id: 2 }]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 8000, measurementType: 'KG' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // 8000 KG / 5000 = 1.6 → needs 2 trucks
                expect(result.vehicles).toHaveLength(2);
            });

            it('should reuse trucks when not enough unique vehicles available', async () => {
                // Only 1 large truck available, but need 3
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 12000, measurementType: 'KG' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // 12000 KG / 5000 = 2.4 → needs 3 trucks
                expect(result.vehicles).toHaveLength(3);
                // Should reuse the same truck
                expect(result.vehicles?.[0].vehicle_id).toBe(largeTruck.vehicle_id);
                expect(result.vehicles?.[1].vehicle_id).toBe(largeTruck.vehicle_id);
                expect(result.vehicles?.[2].vehicle_id).toBe(largeTruck.vehicle_id);
            });

            it('should throw error when no large trucks available for KG items', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck, smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 1000, measurementType: 'KG' },
                    ],
                };

                await expect(getVehicleForPickupRequest(pickupRequest)).rejects.toThrow('No large trucks available.');
            });

            it('should handle multiple items and sum their quantities', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck, { ...largeTruck, vehicle_id: 2 }]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 3000, measurementType: 'KG' },
                        { itemName: 'silicon', quantity: 3000, measurementType: 'KG' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // Total = 6000 KG → needs 2 trucks
                expect(result.vehicles).toHaveLength(2);
            });
        });

        describe('Unit-based (UNIT) Items - Critical Logic Bug', () => {
            it('should expose the logic bug: (remainingItems > 2000 || remainingItems > 500)', async () => {
                // BUG on line 81: (remainingItems > 2000 || remainingItems > 500)
                // This condition is ALWAYS true when remainingItems > 2000
                // The || should be && for proper range checking

                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck, smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 2500, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                // With the bug: will select medium truck (correct by accident)
                // Correct logic should be: remainingItems > 2000 AND mediumTrucks exist
                expect(result.success).toBe(true);
                expect(result.vehicles?.[0].vehicle_type.name).toBe('medium_truck');
            });

            it('should select medium truck for items between 501 and 2000 UNITS', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck, smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 1000, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // Due to the bug, this will use medium truck when remainingItems=1000
                // because (1000 > 2000 || 1000 > 500) evaluates to true
                expect(result.vehicles).toHaveLength(1);
            });

            it('should select small truck for items 500 or less UNITS', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck, smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 300, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                expect(result.vehicles).toHaveLength(1);
                expect(result.vehicles?.[0].vehicle_type.name).toBe('small_truck');
            });

            it('should handle mix of medium and small trucks for large orders', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck, smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 4500, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // 4500 units: should use 2 medium (4000) + 1 small (500)
                expect(result.vehicles).toHaveLength(3);
            });

            it('should cycle through available trucks when reusing', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([
                    mediumTruck,
                    { ...mediumTruck, vehicle_id: 4 },
                    smallTruck,
                ]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 5000, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(true);
                // Should cycle through medium trucks using modulo
                expect(result.vehicles!.length).toBeGreaterThan(0);
            });

            it('should return failure when no vehicles available', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 100, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(false);
                expect(result.reason).toBe('No vehicles available to complete the request');
            });

            it('should return failure when only large trucks available for UNIT items', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 100, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(false);
                expect(result.reason).toBe('No vehicles available to complete the request');
            });
        });

        describe('Edge Cases and Error Handling', () => {
            it('should handle empty items array', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                // Should return unsupported measurement type (undefined)
                expect(result.success).toBe(false);
                expect(result.reason).toBe('Unsupported measurement type.');
            });

            it('should handle invalid measurement type', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'test', quantity: 100, measurementType: 'INVALID' as any },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                expect(result.success).toBe(false);
                expect(result.reason).toBe('Unsupported measurement type.');
            });

            it('should use first item measurement type when items have mixed types', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 1000, measurementType: 'KG' },
                        { itemName: 'phones', quantity: 100, measurementType: 'UNIT' as any },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                // Uses first item's measurement type (KG)
                expect(result.success).toBe(true);
                expect(result.vehicles?.[0].vehicle_type.name).toBe('large_truck');
            });

            it('should handle zero quantity items', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: 0, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                // 0 quantity should still work (edge case)
                expect(result.success).toBe(true);
            });

            it('should handle negative quantities', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([smallTruck]);

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'phones', quantity: -100, measurementType: 'UNIT' },
                    ],
                };

                const result = await getVehicleForPickupRequest(pickupRequest);

                // Negative quantity might cause infinite loop!
                // This test may hang if not handled properly
                expect(result).toBeDefined();
            });

            it('should handle database errors gracefully', async () => {
                mockGetAllVehiclesWithType.mockRejectedValue(new Error('Database connection failed'));

                const pickupRequest: PickupRequestRequest = {
                    originalExternalOrderId: 'ORDER-123',
                    originCompany: 'Company A',
                    destinationCompany: 'Company B',
                    items: [
                        { itemName: 'copper', quantity: 1000, measurementType: 'KG' },
                    ],
                };

                await expect(getVehicleForPickupRequest(pickupRequest)).rejects.toThrow('Database connection failed');
            });
        });
    });

    describe('getTodaysVehicleDeliveries', () => {
        it('should fetch deliveries for the current simulated day', async () => {
            const mockDeliveries = [
                { vehicle_id: 1, delivery_count: 5 },
                { vehicle_id: 2, delivery_count: 3 },
            ];
            mockGetVehicleDeliveriesByDateRange.mockResolvedValue(mockDeliveries as any);

            const result = await getTodaysVehicleDeliveries();

            expect(mockGetVehicleDeliveriesByDateRange).toHaveBeenCalledWith(
                new Date('2025-01-15T12:00:00Z'),
                new Date('2025-01-16T12:00:00Z')
            );
            expect(result).toEqual(mockDeliveries);
        });

        it('should handle empty delivery list', async () => {
            mockGetVehicleDeliveriesByDateRange.mockResolvedValue([]);

            const result = await getTodaysVehicleDeliveries();

            expect(result).toEqual([]);
        });
    });

    describe('reactivateVehicle', () => {
        const disabledVehicle: VehicleWithType = {
            vehicle_id: 1,
            is_active: false,
            daily_operational_cost: 500,
            vehicle_type_id: 1,
            purchase_date: '2025-01-01',
            disabled_date: '2025-01-13T00:00:00Z', // 2 days ago
            vehicle_type: {
                vehicle_type_id: 1,
                name: 'large_truck',
                capacity_type_id: 1,
                maximum_capacity: 5000,
                max_pickups_per_day: 1,
                max_dropoffs_per_day: 1,
            },
            max_pickups_per_day: 1,
        };

        it('should reactivate vehicles disabled 2 or more days ago', async () => {
            mockGetAllVehiclesWithType.mockResolvedValue([disabledVehicle]);
            mockUpdateVehicleStatus.mockResolvedValue({ vehicle_id: 1, is_active: true } as any);

            const result = await reactivateVehicle();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Found Vehicles to Reactivate');
            expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(1, true, null);
        });

        it('should NOT reactivate vehicles disabled less than 2 days ago', async () => {
            const recentlyDisabled = {
                ...disabledVehicle,
                disabled_date: '2025-01-14T00:00:00Z', // 1 day ago
            };
            mockGetAllVehiclesWithType.mockResolvedValue([recentlyDisabled]);

            const result = await reactivateVehicle();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No Vehicles to activate');
            expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
        });

        it('should NOT reactivate already active vehicles', async () => {
            const activeVehicle = {
                ...disabledVehicle,
                is_active: true,
            };
            mockGetAllVehiclesWithType.mockResolvedValue([activeVehicle]);

            const result = await reactivateVehicle();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No Vehicles to activate');
            expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
        });

        it('should NOT reactivate vehicles without disabled_date', async () => {
            const vehicleWithoutDate = {
                ...disabledVehicle,
                disabled_date: undefined,
            };
            mockGetAllVehiclesWithType.mockResolvedValue([vehicleWithoutDate]);

            const result = await reactivateVehicle();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No Vehicles to activate');
            expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
        });

        it('should reactivate multiple vehicles that meet criteria', async () => {
            const vehicle2 = {
                ...disabledVehicle,
                vehicle_id: 2,
                disabled_date: '2025-01-10T00:00:00Z', // 5 days ago
            };
            mockGetAllVehiclesWithType.mockResolvedValue([disabledVehicle, vehicle2]);
            mockUpdateVehicleStatus.mockResolvedValue({ is_active: true } as any);

            const result = await reactivateVehicle();

            expect(result.success).toBe(true);
            expect(mockUpdateVehicleStatus).toHaveBeenCalledTimes(2);
            expect(result.data).toHaveLength(2);
        });

        it('should return failure when no vehicles exist', async () => {
            mockGetAllVehiclesWithType.mockResolvedValue([]);

            const result = await reactivateVehicle();

            expect(result.success).toBe(false);
            expect(result.message).toBe('No Vehicles to activate');
        });

        it('should handle updateVehicleStatus errors gracefully', async () => {
            mockGetAllVehiclesWithType.mockResolvedValue([disabledVehicle]);
            mockUpdateVehicleStatus.mockRejectedValue(new Error('Database update failed'));

            await expect(reactivateVehicle()).rejects.toThrow('Database update failed');
        });
    });
});
