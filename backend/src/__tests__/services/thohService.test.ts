import {
    beginSimulation,
    processTruckFailure,
    handleTruckDelivery,
    handleTruckFailure,
} from '../../services/thohService';
import { autonomyService } from '../../services/AutonomyService';
import { getAllVehiclesWithType, updateVehicleStatus } from '../../models/vehicleRepository';
import { simulatedClock } from '../../utils';
import { TruckDelivery, VehicleWithType } from '../../types';
import { TruckFailureRequest, TruckFailureInfo } from '../../types/thoh';

// Mock dependencies
jest.mock('../../services/AutonomyService', () => ({
    autonomyService: {
        start: jest.fn(),
        handleVehicleFailure: jest.fn(),
        handleTruckDelivery: jest.fn(),
    },
}));
jest.mock('../../models/vehicleRepository');
jest.mock('../../utils', () => ({
    simulatedClock: {
        getCurrentDate: jest.fn(),
    },
}));

describe('thohService', () => {
    const mockGetAllVehiclesWithType = getAllVehiclesWithType as jest.MockedFunction<typeof getAllVehiclesWithType>;
    const mockUpdateVehicleStatus = updateVehicleStatus as jest.MockedFunction<typeof updateVehicleStatus>;
    const mockSimulatedClock = simulatedClock as jest.Mocked<typeof simulatedClock>;
    const mockAutonomyService = autonomyService as jest.Mocked<typeof autonomyService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSimulatedClock.getCurrentDate.mockReturnValue(new Date('2025-01-15T12:00:00Z'));
    });

    describe('beginSimulation', () => {
        it('should call autonomyService.start with provided start time', () => {
            const startTime = Date.now();

            beginSimulation(startTime);

            expect(mockAutonomyService.start).toHaveBeenCalledWith(startTime);
            expect(mockAutonomyService.start).toHaveBeenCalledTimes(1);
        });

        it('should handle zero start time', () => {
            beginSimulation(0);

            expect(mockAutonomyService.start).toHaveBeenCalledWith(0);
        });

        it('should handle negative start time', () => {
            beginSimulation(-1000);

            expect(mockAutonomyService.start).toHaveBeenCalledWith(-1000);
        });
    });

    describe('processTruckFailure', () => {
        it('should call autonomyService.handleVehicleFailure with failure request', async () => {
            const failureRequest: TruckFailureRequest = {
                truckName: 'large_truck',
                failureQuantity: 2,
                simulationDate: '2025-01-15',
                simulationTime: '12:00:00',
            };

            await processTruckFailure(failureRequest);

            expect(mockAutonomyService.handleVehicleFailure).toHaveBeenCalledWith(failureRequest);
            expect(mockAutonomyService.handleVehicleFailure).toHaveBeenCalledTimes(1);
        });

        it('should handle zero failure quantity', async () => {
            const failureRequest: TruckFailureRequest = {
                truckName: 'large_truck',
                failureQuantity: 0,
                simulationDate: '2025-01-15',
                simulationTime: '12:00:00',
            };

            await processTruckFailure(failureRequest);

            expect(mockAutonomyService.handleVehicleFailure).toHaveBeenCalledWith(failureRequest);
        });
    });

    describe('handleTruckDelivery', () => {
        it('should call autonomyService.handleTruckDelivery with delivery info', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 123,
                itemName: 'large_truck',
                quantity: 4,
                totalPrice: '400000',
                status: 'DELIVERED',
                message: 'Delivery successful',
                canFulfill: true,
                maximumLoad: 5000,
                operatingCostPerDay: '500/day',
            };

            await handleTruckDelivery(truckDelivery);

            expect(mockAutonomyService.handleTruckDelivery).toHaveBeenCalledWith(truckDelivery);
            expect(mockAutonomyService.handleTruckDelivery).toHaveBeenCalledTimes(1);
        });

        it('should handle delivery that cannot be fulfilled', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 124,
                itemName: 'large_truck',
                quantity: 0,
                totalPrice: '0',
                status: 'FAILED',
                message: 'Out of stock',
                canFulfill: false,
                maximumLoad: 5000,
                operatingCostPerDay: '500/day',
            };

            await handleTruckDelivery(truckDelivery);

            expect(mockAutonomyService.handleTruckDelivery).toHaveBeenCalledWith(truckDelivery);
        });
    });

    describe('handleTruckFailure - Critical Business Logic', () => {
        const largeTruck1: VehicleWithType = {
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
            max_dropoffs_per_day: 1,
        };

        const largeTruck2: VehicleWithType = {
            ...largeTruck1,
            vehicle_id: 2,
        };

        const mediumTruck: VehicleWithType = {
            vehicle_id: 3,
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
            max_dropoffs_per_day: 100,
        };

        describe('Successful Failure Operations', () => {
            it('should disable specified number of trucks of matching type', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1, largeTruck2]);
                mockUpdateVehicleStatus.mockResolvedValue({ vehicle_id: 1, is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 2,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                expect(result.success).toBe(true);
                expect(result.message).toBe('Successfully Disabled Trucks');
                expect(mockUpdateVehicleStatus).toHaveBeenCalledTimes(2);
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(
                    1,
                    false,
                    '2025-01-15T12:00:00.000Z'
                );
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(
                    2,
                    false,
                    '2025-01-15T12:00:00.000Z'
                );
            });

            it('should only disable specified quantity even if more vehicles available', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([
                    largeTruck1,
                    largeTruck2,
                    { ...largeTruck1, vehicle_id: 3 },
                ]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                expect(result.success).toBe(true);
                expect(mockUpdateVehicleStatus).toHaveBeenCalledTimes(1);
            });

            it('should only fail trucks of matching type', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1, mediumTruck, largeTruck2]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 2,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                expect(result.success).toBe(true);
                // Should only disable large trucks (vehicles 1 and 2), not medium truck (vehicle 3)
                expect(mockUpdateVehicleStatus).toHaveBeenCalledTimes(2);
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(1, false, expect.any(String));
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(2, false, expect.any(String));
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalledWith(3, false, expect.any(String));
            });
        });

        describe('Edge Cases and Error Handling', () => {
            it('should return failure when no vehicles exist', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([]);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vehicles to fail');
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
            });

            it('should return failure when failureQuantity is 0', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 0,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vehicles to fail');
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
            });

            it('should handle when not enough vehicles of type exist - CRITICAL BUG', async () => {
                // FIXED: Request to fail 3 trucks but only 1 exists
                // Now correctly returns failure when insufficient vehicles

                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 3, // Want to fail 3, but only 1 exists
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                // Fixed behavior: Returns failure when not enough vehicles
                expect(result.success).toBe(false);
                expect(result.message).toContain('Insufficient vehicles');
                expect(result.message).toContain('Requested: 3');
                expect(result.message).toContain('Available: 1');
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
            });

            it('should handle when no vehicles of matching type exist', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([mediumTruck]);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck', // No large trucks available
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                // FIXED: Now correctly returns failure when no matching trucks
                expect(result.success).toBe(false);
                expect(result.message).toContain('Insufficient vehicles');
                expect(result.message).toContain('Requested: 1');
                expect(result.message).toContain('Available: 0');
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
            });

            it('should handle negative failureQuantity', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: -1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                // FIXED: Now correctly returns failure for negative quantity
                expect(result.success).toBe(false);
                expect(result.message).toBe('No vehicles to fail');
            });

            it('should handle database errors during vehicle fetch', async () => {
                mockGetAllVehiclesWithType.mockRejectedValue(new Error('Database connection failed'));

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                await expect(handleTruckFailure(failureInfo)).rejects.toThrow('Database connection failed');
            });

            it('should handle database errors during vehicle update', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);
                mockUpdateVehicleStatus.mockRejectedValue(new Error('Update failed'));

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                await expect(handleTruckFailure(failureInfo)).rejects.toThrow('Update failed');
            });

            it('should handle partial update failures', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1, largeTruck2]);
                mockUpdateVehicleStatus
                    .mockResolvedValueOnce({ vehicle_id: 1, is_active: false } as any)
                    .mockRejectedValueOnce(new Error('Update failed for vehicle 2'));

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 2,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                // Should throw on second update failure
                await expect(handleTruckFailure(failureInfo)).rejects.toThrow('Update failed for vehicle 2');

                // First update should have succeeded
                expect(mockUpdateVehicleStatus).toHaveBeenCalledTimes(2);
            });
        });

        describe('Simulation Date Handling', () => {
            it('should use simulatedClock.getCurrentDate for disabled_date', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                await handleTruckFailure(failureInfo);

                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(
                    1,
                    false,
                    '2025-01-15T12:00:00.000Z'
                );
            });

            it('should handle different simulation dates correctly', async () => {
                mockSimulatedClock.getCurrentDate.mockReturnValue(new Date('2025-12-31T23:59:59Z'));
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 1,
                    simulationDate: '2025-12-31',
                    simulationTime: '23:59:59',
                };

                await handleTruckFailure(failureInfo);

                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(
                    1,
                    false,
                    '2025-12-31T23:59:59.000Z'
                );
            });
        });

        describe('Case Sensitivity', () => {
            it('should match truck types case-sensitively', async () => {
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'Large_Truck', // Different case
                    failureQuantity: 1,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                const result = await handleTruckFailure(failureInfo);

                // Should not match due to case difference - returns insufficient vehicles
                expect(result.success).toBe(false);
                expect(result.message).toContain('Insufficient vehicles');
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalled();
            });
        });

        describe('Vehicle Selection Order', () => {
            it('should fail vehicles in order they are returned from database', async () => {
                const truck3 = { ...largeTruck1, vehicle_id: 3 };
                const truck4 = { ...largeTruck1, vehicle_id: 4 };
                mockGetAllVehiclesWithType.mockResolvedValue([largeTruck1, largeTruck2, truck3, truck4]);
                mockUpdateVehicleStatus.mockResolvedValue({ is_active: false } as any);

                const failureInfo: TruckFailureInfo = {
                    truckName: 'large_truck',
                    failureQuantity: 2,
                    simulationDate: '2025-01-15',
                    simulationTime: '12:00:00',
                };

                await handleTruckFailure(failureInfo);

                // Should fail first 2 vehicles in order
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(1, false, expect.any(String));
                expect(mockUpdateVehicleStatus).toHaveBeenCalledWith(2, false, expect.any(String));
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalledWith(3, false, expect.any(String));
                expect(mockUpdateVehicleStatus).not.toHaveBeenCalledWith(4, false, expect.any(String));
            });
        });
    });
});
