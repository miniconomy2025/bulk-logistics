import { calculateDeliveryCost } from '../../services/DeliveryCostCalculatorService';
import { getVehicleForPickupRequest } from '../../services/vehicleService';
import { getAllLoans } from '../../models/transactionsRepository';
import { PickupRequestRequest } from '../../types/PickupRequest';

// Mock dependencies
jest.mock('../../services/vehicleService');
jest.mock('../../models/transactionsRepository');

const PROFIT_MARGIN = 0.5;

describe('DeliveryCostCalculatorService', () => {
    const mockGetVehicleForPickupRequest = getVehicleForPickupRequest as jest.MockedFunction<typeof getVehicleForPickupRequest>;
    const mockGetAllLoans = getAllLoans as jest.MockedFunction<typeof getAllLoans>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateDeliveryCost', () => {
        const validPickupRequest: PickupRequestRequest = {
            originalExternalOrderId: 'ORDER-123',
            originCompany: 'Company A',
            destinationCompany: 'Company B',
            items: [
                { itemName: 'copper', quantity: 1000, measurementType: 'KG' },
            ],
        };

        describe('Critical Bug Tests - Cost Returning 0', () => {
            it('should NOT return 0 when no vehicles are found', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: false,
                    reason: 'No vehicles available',
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                expect(cost).not.toBe(0);
                expect(cost).toBeGreaterThan(0);
            });

            it('should return fallback cost (150) when vehicle lookup fails', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: false,
                    reason: 'No vehicles available',
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should return the fallback cost
                expect(cost).toBe(150);
            });

            it('should return small cost when vehicles exist but have no operational cost and no loans', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 0, // Zero cost!
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                expect(cost).toBe(Math.ceil(1+PROFIT_MARGIN));
            });
        });

        describe('Valid Cost Calculations', () => {
            it('should calculate cost correctly for large truck with no loans', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Cost = (500 operational + 0 loan) * 1.5 = 750
                expect(cost).toBe(750);
            });

            it('should calculate cost correctly for large truck with active loan', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([
                    {
                        id: 1,
                        loanNumber: 'LOAN-123',
                        loanAmount: 1000000,
                        interestRate: 0.05,
                    },
                ]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Daily loan repayment = (1000000 * 0.05) / 365 + 1000000 / 1825
                // = 136.99 + 547.95 = 684.94 per day
                // Per delivery for large truck = 684.94 / 30 = 22.83
                // Total = 500 + 22.83 = 522.83
                // With 50% profit = 522.83 * 1.5 = 784.25 → ceil = 785
                expect(cost).toBe(785);
            });

            it('should calculate cost correctly for medium truck', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 2,
                            daily_operational_cost: 300,
                            vehicle_type: {
                                vehicle_type_id: 2,
                                name: 'medium_truck',
                                capacity_type_id: 2,
                                maximum_capacity: 2000,
                                max_pickups_per_day: 5,
                                max_dropoffs_per_day: 100,
                            },
                            is_active: true,
                            vehicle_type_id: 2,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Cost per delivery = 300 / 5 = 60
                // With 50% profit = 60 * 1.5 = 90
                expect(cost).toBe(90);
            });

            it('should calculate cost correctly for small truck', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 3,
                            daily_operational_cost: 200,
                            vehicle_type: {
                                vehicle_type_id: 3,
                                name: 'small_truck',
                                capacity_type_id: 2,
                                maximum_capacity: 500,
                                max_pickups_per_day: 200,
                                max_dropoffs_per_day: 500,
                            },
                            is_active: true,
                            vehicle_type_id: 3,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Cost per delivery = 200 / 200 = 1
                // With 50% profit = 1 * 1.5 = 1.5 → ceil = 2
                expect(cost).toBe(2);
            });

            it('should handle multiple vehicles correctly', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                        {
                            vehicle_id: 2,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Cost = (500 + 500) * 1.5 = 1500
                expect(cost).toBe(1500);
            });
        });

        describe('Edge Cases and Error Handling', () => {
            it('should handle division by zero when max_pickups_per_day is 0', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 2,
                            daily_operational_cost: 300,
                            vehicle_type: {
                                vehicle_type_id: 2,
                                name: 'medium_truck',
                                capacity_type_id: 2,
                                maximum_capacity: 2000,
                                max_pickups_per_day: 0, // Division by zero!
                                max_dropoffs_per_day: 100,
                            },
                            is_active: true,
                            vehicle_type_id: 2,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should use full daily cost when max_pickups_per_day is 0
                // Cost = 300 * 1.5 = 450
                expect(cost).toBe(450);
                expect(cost).not.toBe(Infinity);
                expect(cost).not.toBeNaN();
            });

            it('should handle negative operational costs', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: -100, // Negative cost!
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should handle gracefully - either use fallback or ensure positive
                expect(cost).toBeGreaterThan(0);
            });

            it('should handle unknown vehicle types gracefully', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 99,
                            daily_operational_cost: 300,
                            vehicle_type: {
                                vehicle_type_id: 99,
                                name: 'unknown_truck_type', // Unknown type
                                capacity_type_id: 1,
                                maximum_capacity: 1000,
                                max_pickups_per_day: 10,
                                max_dropoffs_per_day: 10,
                            },
                            is_active: true,
                            vehicle_type_id: 99,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should return fallback cost
                expect(cost).toBe(150);
            });

            it('should return fallback cost when getVehicleForPickupRequest throws error', async () => {
                mockGetVehicleForPickupRequest.mockRejectedValue(new Error('Database connection failed'));
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should catch error and return fallback
                expect(cost).toBe(150);
            });

            it('should return fallback cost when getAllLoans throws error', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockRejectedValue(new Error('Database connection failed'));

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should catch error and return fallback
                expect(cost).toBe(150);
            });

            it('should handle very large loan amounts without overflow', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([
                    {
                        id: 1,
                        loanNumber: 'LOAN-123',
                        loanAmount: Number.MAX_SAFE_INTEGER,
                        interestRate: 0.05,
                    },
                ]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should handle large numbers gracefully
                expect(cost).toBeGreaterThan(0);
                expect(cost).toBeLessThan(Number.MAX_SAFE_INTEGER);
                expect(Number.isFinite(cost)).toBe(true);
            });

            it('should handle multiple loans with different interest rates', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 500,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([
                    {
                        id: 1,
                        loanNumber: 'LOAN-1',
                        loanAmount: 500000,
                        interestRate: 0.05,
                    },
                    {
                        id: 2,
                        loanNumber: 'LOAN-2',
                        loanAmount: 500000,
                        interestRate: 0.07,
                    },
                ]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Should calculate average interest correctly
                // Average interest = (0.05 + 0.07) / 2 = 0.06
                // Total loan = 1000000
                // Daily repayment = (1000000 * 0.06) / 365 + 1000000 / 1825
                // = 164.38 + 547.95 = 712.33
                // Per delivery = 712.33 / 30 = 23.74
                // Total = 500 + 23.74 = 523.74
                // With profit = 523.74 * 1.5 = 785.61 → ceil = 786
                expect(cost).toBe(786);
            });
        });

        describe('Profit Margin Application', () => {
            it('should always apply 50% profit margin', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 1,
                            daily_operational_cost: 1000,
                            vehicle_type: {
                                vehicle_type_id: 1,
                                name: 'large_truck',
                                capacity_type_id: 1,
                                maximum_capacity: 5000,
                                max_pickups_per_day: 1,
                                max_dropoffs_per_day: 1,
                            },
                            is_active: true,
                            vehicle_type_id: 1,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Base cost = 1000
                // With 50% margin = 1000 * 1.5 = 1500
                expect(cost).toBe(1500);
            });

            it('should round up fractional costs', async () => {
                mockGetVehicleForPickupRequest.mockResolvedValue({
                    success: true,
                    vehicles: [
                        {
                            vehicle_id: 2,
                            daily_operational_cost: 333,
                            vehicle_type: {
                                vehicle_type_id: 2,
                                name: 'medium_truck',
                                capacity_type_id: 2,
                                maximum_capacity: 2000,
                                max_pickups_per_day: 5,
                                max_dropoffs_per_day: 100,
                            },
                            is_active: true,
                            vehicle_type_id: 2,
                            purchase_date: '2025-01-01',
                        } as any,
                    ],
                });
                mockGetAllLoans.mockResolvedValue([]);

                const cost = await calculateDeliveryCost(validPickupRequest);

                // Per delivery = 333 / 5 = 66.6
                // With profit = 66.6 * 1.5 = 99.9
                // Should round up to 100
                expect(cost).toBe(100);
                expect(Number.isInteger(cost)).toBe(true);
            });
        });
    });
});
