// Mock axios and fs BEFORE imports
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
        get: jest.fn(),
        post: jest.fn(),
    })),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

import { thohApiClient } from '../../client/thohClient';
import AppError from '../../utils/errorHandlingMiddleware/appError';
import type {
    TruckPurchaseRequest,
    TruckPurchaseResponse,
    TimeResponse,
    TruckInfoResponse,
    MachinesInformationResponse,
} from '../../types/thoh';

describe('THOHApiClient', () => {
    const mockGet = jest.fn();
    const mockPost = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the axios client instance
        (thohApiClient as any).client = {
            get: mockGet,
            post: mockPost,
        };
    });

    describe('purchaseTruck', () => {
        const truckRequest: TruckPurchaseRequest = {
            truckName: 'large_truck',
            quantity: 2,
        };

        it('should successfully purchase trucks', async () => {
            const purchaseResponse: TruckPurchaseResponse = {
                orderId: 12345,
                truckName: 'large_truck',
                totalPrice: 200000,
                unitWeight: 5000,
                totalWeight: 10000,
                quantity: 2,
                maximumLoad: 5000,
                operatingCostPerDay: '500',
                bankAccount: 'ACC-THOH-123',
            };

            mockPost.mockResolvedValueOnce({ data: purchaseResponse });

            const result = await thohApiClient.purchaseTruck(truckRequest);

            expect(result).toEqual(purchaseResponse);
            expect(mockPost).toHaveBeenCalledWith('/trucks', truckRequest);
        });

        it('should purchase medium trucks', async () => {
            const mediumTruckRequest: TruckPurchaseRequest = {
                truckName: 'medium_truck',
                quantity: 5,
            };

            const purchaseResponse: TruckPurchaseResponse = {
                orderId: 12346,
                truckName: 'medium_truck',
                totalPrice: 150000,
                unitWeight: 3000,
                totalWeight: 15000,
                quantity: 5,
                maximumLoad: 2000,
                operatingCostPerDay: '300',
                bankAccount: 'ACC-THOH-123',
            };

            mockPost.mockResolvedValueOnce({ data: purchaseResponse });

            const result = await thohApiClient.purchaseTruck(mediumTruckRequest);

            expect(result).toEqual(purchaseResponse);
        });

        it('should reject negative quantity - FIXED', async () => {
            const negativeRequest: TruckPurchaseRequest = {
                truckName: 'large_truck',
                quantity: -5,
            };

            // Fixed: Now validates and rejects negative quantities
            await expect(thohApiClient.purchaseTruck(negativeRequest)).rejects.toThrow(AppError);
            await expect(thohApiClient.purchaseTruck(negativeRequest)).rejects.toThrow(
                'Truck quantity must be greater than 0'
            );
        });

        it('should reject zero quantity - FIXED', async () => {
            const zeroRequest: TruckPurchaseRequest = {
                truckName: 'large_truck',
                quantity: 0,
            };

            // Fixed: Now validates and rejects zero quantity
            await expect(thohApiClient.purchaseTruck(zeroRequest)).rejects.toThrow(AppError);
            await expect(thohApiClient.purchaseTruck(zeroRequest)).rejects.toThrow(
                'Truck quantity must be greater than 0'
            );
        });

        it('should handle invalid truck name - POTENTIAL BUG', async () => {
            const invalidRequest: TruckPurchaseRequest = {
                truckName: 'super_mega_truck',
                quantity: 1,
            };

            mockPost.mockResolvedValueOnce({ data: {} });

            // No client-side validation of truck types
            await thohApiClient.purchaseTruck(invalidRequest);

            expect(mockPost).toHaveBeenCalledWith('/trucks', {
                truckName: 'super_mega_truck',
                quantity: 1,
            });
        });

        it('should reject empty truck name - FIXED', async () => {
            const emptyNameRequest: TruckPurchaseRequest = {
                truckName: '',
                quantity: 1,
            };

            // Fixed: Now validates and rejects empty truck names
            await expect(thohApiClient.purchaseTruck(emptyNameRequest)).rejects.toThrow(AppError);
            await expect(thohApiClient.purchaseTruck(emptyNameRequest)).rejects.toThrow(
                'Truck name is required'
            );
        });

        it('should log purchase details', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockPost.mockResolvedValueOnce({
                data: {
                    orderId: 123,
                    truckName: 'large_truck',
                    totalPrice: 100000,
                    unitWeight: 5000,
                    totalWeight: 5000,
                    quantity: 1,
                    maximumLoad: 5000,
                    operatingCostPerDay: '500',
                    bankAccount: 'ACC-123',
                },
            });

            await thohApiClient.purchaseTruck(truckRequest);

            expect(consoleSpy).toHaveBeenCalledWith(
                '------PURCHASING TRUCKS-------\nTRUCK REQUEST: ',
                truckRequest
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '------PURCHASING COMPLETE-------\nTRUCK RESPONSE: ',
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });

        it('should throw AppError when purchase fails - FIXED', async () => {
            mockPost.mockRejectedValueOnce(new Error('Insufficient inventory'));

            // Fixed: Now wraps all errors in AppError
            await expect(thohApiClient.purchaseTruck(truckRequest)).rejects.toThrow(AppError);
        });

        it('should handle very large quantities', async () => {
            const largeQuantityRequest: TruckPurchaseRequest = {
                truckName: 'large_truck',
                quantity: 999999,
            };

            mockPost.mockResolvedValueOnce({ data: {} });

            await thohApiClient.purchaseTruck(largeQuantityRequest);

            expect(mockPost).toHaveBeenCalledWith('/trucks', {
                truckName: 'large_truck',
                quantity: 999999,
            });
        });
    });

    describe('getTime', () => {
        it('should return time when successful', async () => {
            const timeResponse: TimeResponse = {
                epochStartTime: 1642521600000,
            };

            mockGet.mockResolvedValueOnce({ data: timeResponse });

            const result = await thohApiClient.getTime();

            expect(result).toEqual(timeResponse);
            expect(mockGet).toHaveBeenCalledWith('/time');
        });

        it('should throw AppError when time request fails - FIXED', async () => {
            mockGet.mockRejectedValueOnce(new Error('Service unavailable'));

            // Fixed: Now throws AppError consistently
            await expect(thohApiClient.getTime()).rejects.toThrow(AppError);
        });

        it('should handle missing epochStartTime in response', async () => {
            const timeResponse: TimeResponse = {
                error: 'Time not available',
            };

            mockGet.mockResolvedValueOnce({ data: timeResponse });

            const result = await thohApiClient.getTime();

            expect(result).toEqual(timeResponse);
        });

        it('should handle empty response', async () => {
            mockGet.mockResolvedValueOnce({ data: {} });

            const result = await thohApiClient.getTime();

            expect(result).toEqual({});
        });
    });

    describe('getTrucksInformation', () => {
        it('should return all truck information', async () => {
            const trucksInfo: TruckInfoResponse[] = [
                {
                    truckName: 'large_truck',
                    description: 'Large capacity truck',
                    price: 100000,
                    quantity: 10,
                    operatingCost: 500,
                    maximumLoad: 5000,
                    weight: 5000,
                },
                {
                    truckName: 'medium_truck',
                    description: 'Medium capacity truck',
                    price: 50000,
                    quantity: 20,
                    operatingCost: 300,
                    maximumLoad: 2000,
                    weight: 3000,
                },
            ];

            mockGet.mockResolvedValueOnce({ data: trucksInfo });

            const result = await thohApiClient.getTrucksInformation();

            expect(result).toEqual(trucksInfo);
            expect(mockGet).toHaveBeenCalledWith('/trucks');
        });

        it('should return empty array when no trucks available', async () => {
            mockGet.mockResolvedValueOnce({ data: [] });

            const result = await thohApiClient.getTrucksInformation();

            expect(result).toEqual([]);
        });

        it('should throw AppError when request fails - BUG IN ERROR HANDLING', async () => {
            const error = {
                error: 'Database connection failed',
            };

            mockGet.mockRejectedValueOnce(error);

            // BUG: Accesses error.error which doesn't exist on Error object
            // Should be error.message
            await expect(thohApiClient.getTrucksInformation()).rejects.toThrow(AppError);
        });

        it('should handle malformed truck data', async () => {
            const malformedData: any[] = [
                {
                    // Missing required fields
                    truckName: 'incomplete_truck',
                },
            ];

            mockGet.mockResolvedValueOnce({ data: malformedData });

            const result = await thohApiClient.getTrucksInformation();

            expect(result).toEqual(malformedData);
        });

        it('should handle negative prices - POTENTIAL BUG', async () => {
            const trucksWithNegativePrice: TruckInfoResponse[] = [
                {
                    truckName: 'large_truck',
                    description: 'Large capacity truck',
                    price: -100000,
                    quantity: 10,
                    operatingCost: 500,
                    maximumLoad: 5000,
                    weight: 5000,
                },
            ];

            mockGet.mockResolvedValueOnce({ data: trucksWithNegativePrice });

            const result = await thohApiClient.getTrucksInformation();

            expect(result[0].price).toBe(-100000);
        });

        it('should handle zero quantity trucks', async () => {
            const trucksWithZeroQty: TruckInfoResponse[] = [
                {
                    truckName: 'out_of_stock_truck',
                    description: 'Currently unavailable',
                    price: 100000,
                    quantity: 0,
                    operatingCost: 500,
                    maximumLoad: 5000,
                    weight: 5000,
                },
            ];

            mockGet.mockResolvedValueOnce({ data: trucksWithZeroQty });

            const result = await thohApiClient.getTrucksInformation();

            expect(result[0].quantity).toBe(0);
        });
    });

    describe('getMachinesInformation', () => {
        it('should return all machines information', async () => {
            const machinesInfo: MachinesInformationResponse = {
                machines: [
                    {
                        machineName: 'phone_assembly',
                        inputs: 'electronics, screens, cases',
                        quantity: 5,
                        inputRatio: {
                            electronics: 1,
                            screens: 1,
                            cases: 1,
                        },
                        productionRate: 100,
                        price: 50000,
                        weight: 1000,
                    },
                    {
                        machineName: 'silicon_smelter',
                        inputs: 'sand',
                        quantity: 3,
                        inputRatio: {
                            sand: 10,
                        },
                        productionRate: 50,
                        price: 75000,
                        weight: 2000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: machinesInfo });

            const result = await thohApiClient.getMachinesInformation();

            expect(result).toEqual(machinesInfo);
            expect(mockGet).toHaveBeenCalledWith('/machines');
        });

        it('should return empty machines array when none available', async () => {
            const emptyResponse: MachinesInformationResponse = {
                machines: [],
            };

            mockGet.mockResolvedValueOnce({ data: emptyResponse });

            const result = await thohApiClient.getMachinesInformation();

            expect(result).toEqual(emptyResponse);
        });

        it('should throw AppError when request fails - BUG IN ERROR HANDLING', async () => {
            const error = {
                error: 'Service timeout',
            };

            mockGet.mockRejectedValueOnce(error);

            // BUG: Same as getTrucksInformation - accesses error.error instead of error.message
            await expect(thohApiClient.getMachinesInformation()).rejects.toThrow(AppError);
        });

        it('should handle machines with complex input ratios', async () => {
            const complexMachines: MachinesInformationResponse = {
                machines: [
                    {
                        machineName: 'advanced_assembly',
                        inputs: 'copper, plastic, aluminium, silicon',
                        quantity: 1,
                        inputRatio: {
                            copper: 5,
                            plastic: 3,
                            aluminium: 2,
                            silicon: 1,
                        },
                        productionRate: 10,
                        price: 200000,
                        weight: 5000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: complexMachines });

            const result = await thohApiClient.getMachinesInformation();

            expect(result).toEqual(complexMachines);
        });

        it('should handle machines with zero quantity', async () => {
            const zeroQtyMachines: MachinesInformationResponse = {
                machines: [
                    {
                        machineName: 'unavailable_machine',
                        inputs: 'sand',
                        quantity: 0,
                        inputRatio: { sand: 1 },
                        productionRate: 0,
                        price: 100000,
                        weight: 1000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: zeroQtyMachines });

            const result = await thohApiClient.getMachinesInformation();

            expect(result.machines[0].quantity).toBe(0);
        });

        it('should handle negative production rates - POTENTIAL BUG', async () => {
            const negativeProdRate: MachinesInformationResponse = {
                machines: [
                    {
                        machineName: 'broken_machine',
                        inputs: 'sand',
                        quantity: 1,
                        inputRatio: { sand: 1 },
                        productionRate: -10,
                        price: 100000,
                        weight: 1000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: negativeProdRate });

            const result = await thohApiClient.getMachinesInformation();

            expect(result.machines[0].productionRate).toBe(-10);
        });

        it('should handle machines with empty input ratios', async () => {
            const emptyInputRatios: MachinesInformationResponse = {
                machines: [
                    {
                        machineName: 'no_input_machine',
                        inputs: '',
                        quantity: 1,
                        inputRatio: {},
                        productionRate: 100,
                        price: 100000,
                        weight: 1000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: emptyInputRatios });

            const result = await thohApiClient.getMachinesInformation();

            expect(result.machines[0].inputRatio).toEqual({});
        });
    });

    describe('Error Handling Consistency - FIXED', () => {
        it('should demonstrate consistent error handling across all methods', async () => {
            mockGet.mockRejectedValueOnce(new Error('Failed'));
            mockPost.mockRejectedValueOnce(new Error('Failed'));

            // Fixed: All methods now throw AppError consistently
            await expect(thohApiClient.getTime()).rejects.toThrow(AppError);

            mockGet.mockRejectedValueOnce(new Error('Failed'));
            await expect(thohApiClient.getTrucksInformation()).rejects.toThrow(AppError);

            mockGet.mockRejectedValueOnce(new Error('Failed'));
            await expect(thohApiClient.getMachinesInformation()).rejects.toThrow(AppError);

            mockPost.mockRejectedValueOnce(new Error('Failed'));
            await expect(
                thohApiClient.purchaseTruck({ truckName: 'test', quantity: 1 })
            ).rejects.toThrow(AppError);
        });
    });

    describe('Constructor', () => {
        it('should use correct THOH base URL', () => {
            expect((thohApiClient as any).serviceName).toBe('THOH');
        });
    });
});
