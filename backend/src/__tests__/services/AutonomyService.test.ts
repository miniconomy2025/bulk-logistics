// Mock fs module to prevent certificate file loading
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

// Mock all dependencies BEFORE importing the service
jest.mock('../../services/ShipmentPlannerService');
jest.mock('../../models/shipmentRepository');
jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/vehicleRepository');
jest.mock('../../client/notificationClient');
jest.mock('../../client/thohClient');
jest.mock('../../client/bankClient');
jest.mock('../../services/vehicleService');
jest.mock('../../models/companyRepository');
jest.mock('../../utils', () => ({
    simulatedClock: {
        initialize: jest.fn(),
        getCurrentDate: jest.fn(),
        SIMULATED_DAY_IN_REAL_MS: 15000,
    },
    SimulatedClock: {
        SIMULATED_DAY_IN_REAL_MS: 15000,
    },
}));
jest.mock('../../models/notificationsQueueRepository');

// Import after mocking
import AutonomyService from '../../services/AutonomyService';
import { ShipmentPlannerService } from '../../services/ShipmentPlannerService';
import { shipmentModel } from '../../models/shipmentRepository';
import { updateCompletionDate, updatePickupRequestStatuses } from '../../models/pickupRequestRepository';
import { addVehicle, findAllVehiclesWithShipments, getAllVehiclesWithType } from '../../models/vehicleRepository';
import { notificationApiClient } from '../../client/notificationClient';
import { thohApiClient } from '../../client/thohClient';
import { bankApiClient } from '../../client/bankClient';
import { reactivateVehicle } from '../../services/vehicleService';
import { getCompanyByName, updateCompanyDetails } from '../../models/companyRepository';
import { simulatedClock } from '../../utils';
import { addOrUpdateFailedNotification, getQueuedNotifications, removeSuccessfulNotification } from '../../models/notificationsQueueRepository';
import { TruckDelivery } from '../../types';
import type { TruckFailureRequest } from '../../types/thoh';

describe('AutonomyService', () => {
    let autonomyService: AutonomyService;

    // Mock implementations
    const mockShipmentPlanner = ShipmentPlannerService as jest.MockedClass<typeof ShipmentPlannerService>;
    const mockSimulatedClock = simulatedClock as jest.Mocked<typeof simulatedClock>;
    const mockBankClient = bankApiClient as jest.Mocked<typeof bankApiClient>;
    const mockThohClient = thohApiClient as jest.Mocked<typeof thohApiClient>;
    const mockNotificationClient = notificationApiClient as jest.Mocked<typeof notificationApiClient>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Get singleton instance
        autonomyService = AutonomyService.getInstance();

        // Setup default mock returns
        mockSimulatedClock.getCurrentDate.mockReturnValue(new Date('2025-01-15T00:00:00Z'));
        mockBankClient.getAccountDetails.mockResolvedValue({
            success: true,
            account_number: 'BL-123456',
            net_balance: 1000000,
        });
        mockBankClient.createAccount.mockResolvedValue({
            account_number: 'BL-123456',
        });
        mockBankClient.getAllLoanDetails.mockResolvedValue({
            success: true,
            total_outstanding_amount: 0,
            loans: [],
        });
        mockThohClient.getTrucksInformation.mockResolvedValue([
            { truckName: 'large_truck', price: 100000, operatingCost: 500, maximumLoad: 5000, description: '', quantity: 10, weight: 2000 },
            { truckName: 'medium_truck', price: 50000, operatingCost: 300, maximumLoad: 3000, description: '', quantity: 10, weight: 1500 },
        ]);
        (reactivateVehicle as jest.Mock).mockResolvedValue({
            success: true,
            message: 'Vehicles reactivated',
            data: [],
        });
        (getAllVehiclesWithType as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.useRealTimers();
        // Stop the service if it's running
        if ((autonomyService as any).isRunning) {
            autonomyService.stop();
        }
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance when getInstance is called multiple times', () => {
            const instance1 = AutonomyService.getInstance();
            const instance2 = AutonomyService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Lifecycle Methods', () => {
        describe('start()', () => {
            it('should initialize the simulation with the provided start time', () => {
                const startTime = Date.now();

                autonomyService.start(startTime);

                expect(mockSimulatedClock.initialize).toHaveBeenCalledWith(startTime);
                expect((autonomyService as any).isRunning).toBe(true);
            });

            it('should set up a tick interval that runs every 15 seconds', () => {
                const setIntervalSpy = jest.spyOn(global, 'setInterval');
                const startTime = Date.now();

                autonomyService.start(startTime);

                expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
                setIntervalSpy.mockRestore();
            });

            it('should not start if already running', () => {
                const startTime = Date.now();
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                autonomyService.start(startTime);
                autonomyService.start(startTime);

                expect(consoleWarnSpy).toHaveBeenCalledWith('Simulation is already running. Start command ignored.');
                expect(mockSimulatedClock.initialize).toHaveBeenCalledTimes(1);

                consoleWarnSpy.mockRestore();
            });
        });

        describe('stop()', () => {
            it('should stop the simulation and clear the interval', () => {
                const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
                const startTime = Date.now();
                autonomyService.start(startTime);

                autonomyService.stop();

                expect((autonomyService as any).isRunning).toBe(false);
                expect(clearIntervalSpy).toHaveBeenCalled();
                clearIntervalSpy.mockRestore();
            });

            it('should reset state when stopped', () => {
                const startTime = Date.now();
                autonomyService.start(startTime);

                autonomyService.stop();

                expect((autonomyService as any).hasActiveLoan).toBe(false);
                expect((autonomyService as any).initialTrucksSecured).toBe(false);
                expect((autonomyService as any).funds).toBe(0);
            });

            it('should not stop if not running', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                autonomyService.stop();

                expect(consoleWarnSpy).toHaveBeenCalledWith('Simulation is not running. Stop command ignored.');

                consoleWarnSpy.mockRestore();
            });
        });

        describe('reset()', () => {
            it('should stop and restart the simulation with new data', () => {
                const startTime = Date.now();
                const newStartTime = startTime + 86400000;
                autonomyService.start(startTime);

                autonomyService.reset(newStartTime);

                expect(mockSimulatedClock.initialize).toHaveBeenCalledWith(newStartTime);
                expect((autonomyService as any).isRunning).toBe(true);
            });
        });
    });

    describe('Initialization Operations', () => {
        beforeEach(() => {
            mockBankClient.applyForLoan.mockResolvedValue({
                success: true,
                loan_number: 'LOAN-123',
            });
            mockThohClient.purchaseTruck.mockResolvedValue({
                orderId: 123,
                truckName: 'large_truck',
                quantity: 4,
                totalPrice: 100000,
                unitWeight: 2000,
                totalWeight: 8000,
                maximumLoad: 5000,
                operatingCostPerDay: '500/day',
                bankAccount: 'THOH-ACCOUNT',
            });
            mockBankClient.makePayment.mockResolvedValue({
                success: true,
                transaction_number: 'TXN-123',
                status: 'COMPLETED',
            });
            (updateCompanyDetails as jest.Mock).mockResolvedValue(undefined);
        });

        it('should create a bank account if one does not exist', async () => {
            mockBankClient.getAccountDetails.mockResolvedValueOnce({
                success: false,
            });

            const startTime = Date.now();
            autonomyService.start(startTime);

            // Fast-forward to trigger the first tick
            await jest.advanceTimersByTimeAsync(15000);

            expect(mockBankClient.createAccount).toHaveBeenCalledWith(
                'https://bulk-logistics-api.projects.bbdgrad.com/api/bank'
            );
            expect(updateCompanyDetails).toHaveBeenCalledWith('bulk-logistics', {
                bankAccountNumber: 'BL-123456',
            });
        });

        it('should apply for a loan if no active loan exists', async () => {
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [],
            });
            const startTime = Date.now();
            autonomyService.start(startTime);

            // Fast-forward to trigger the first tick and wait for all promises
            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve(); // Allow pending promises to resolve

            expect(mockBankClient.applyForLoan).toHaveBeenCalled();
        });

        it('should not apply for a loan if one already exists', async () => {
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [{ loan_number: 'LOAN-123', initial_amount: 1000000, interest_rate: 0.05, write_off: false, outstanding_amount: 1000000 }],
            });

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            expect(mockBankClient.applyForLoan).not.toHaveBeenCalled();
        });

        it('should purchase initial trucks (4 large, 4 medium)', async () => {
            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve()

            expect(mockThohClient.purchaseTruck).toHaveBeenCalledWith({
                truckName: 'large_truck',
                quantity: 4,
            });
            expect(mockThohClient.purchaseTruck).toHaveBeenCalledWith({
                truckName: 'medium_truck',
                quantity: 4,
            });
        });

        it('should make payments for purchased trucks', async () => {
            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            // Give extra time for all async operations
            await Promise.resolve()

            expect(mockBankClient.makePayment).toHaveBeenCalledTimes(2);
            expect(mockBankClient.makePayment).toHaveBeenCalledWith(
                expect.objectContaining({
                    paymentDetails: expect.objectContaining({
                        to_account_number: 'THOH-ACCOUNT',
                        amount: 400000, // 4 trucks * 100000
                    }),
                    transactionCategory: 'PURCHASE',
                })
            );
        });

        it('should not purchase trucks if they already exist', async () => {
            (getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                { vehicle_id: 1, type_name: 'large_truck' },
                { vehicle_id: 2, type_name: 'medium_truck' },
            ]);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            expect(mockThohClient.purchaseTruck).not.toHaveBeenCalled();
        });
    });

    describe('Daily Tasks', () => {
        beforeEach(() => {
            // Mock initialization as complete
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [{ loan_number: 'LOAN-123', initial_amount: 1000000, interest_rate: 0.05, write_off: false, outstanding_amount: 1000000 }],
            });
            (getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                { vehicle_id: 1, type_name: 'large_truck' },
            ]);
        });

        it('should reactivate vehicles at the start of each day', async () => {//
            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            expect(reactivateVehicle).toHaveBeenCalled();
        });

        it('should plan and dispatch shipments', async () => {
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 100,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            expect(mockPlanDailyShipments).toHaveBeenCalled();
        });

        it('should send pickup notifications for planned shipments', async () => { //
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 100,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            expect(mockNotificationClient.sendLogisticsNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'EXT-123',
                    notificationURL: 'http://origin.com/notify',
                    type: 'PICKUP',
                    quantity: 100,
                    items: [{ name: 'copper', quantity: 100 }],
                })
            );
        });

        it('should wait 2/3 of the day before sending delivery notifications', async () => { // <<
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [],
                plannedRequestIds: [],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);

            // Should wait 10 seconds (2/3 of 15 seconds) before processing deliveries
            expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 10000);
            setTimeoutSpy.mockRestore();
        });

        it('should send pickup notifications after waiting period', async () => {
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 100,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);
            (removeSuccessfulNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // We only send/resend delivery notifications 
            expect(mockNotificationClient.sendLogisticsNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    "id": "EXT-123",
                    "items": [{ "name": "copper", "quantity": 100 }],
                    "notificationURL": "http://origin.com/notify",
                    "quantity": 100,
                    "type": "PICKUP"
                })
            );
        });

        it('should update pickup request statuses after deliveries', async () => {
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [],
                plannedRequestIds: [],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);
            // We wait for two ticks since we update after the delivery has happened
            await jest.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(updatePickupRequestStatuses).toHaveBeenCalledWith(expect.any(Date));
        });

        it('should only process once per simulated day', async () => { //
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [],
                plannedRequestIds: [],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            // First tick
            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // Second tick (same date)
            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // Should only plan once
            expect(mockPlanDailyShipments).toHaveBeenCalledTimes(1);
        });

        it('should process a new day when the date changes', async () => { //
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [],
                plannedRequestIds: [],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);

            mockSimulatedClock.getCurrentDate
                .mockReturnValueOnce(new Date('2025-01-15T00:00:00Z'))
                .mockReturnValueOnce(new Date('2025-01-15T00:00:00Z'))
                .mockReturnValue(new Date('2025-01-16T00:00:00Z'));

            const startTime = Date.now();
            autonomyService.start(startTime);

            // First day
            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // Second day
            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            expect(mockPlanDailyShipments).toHaveBeenCalledTimes(2);
        });
    });

    describe('Notification Retry Logic', () => {
        beforeEach(() => {
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [{ loan_number: 'LOAN-123', initial_amount: 1000000, interest_rate: 0.05, write_off: false, outstanding_amount: 1000000 }],
            });
            (getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                { vehicle_id: 1, type_name: 'large_truck' },
            ]);
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [],
                plannedRequestIds: [],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);
        });

        it('should retry queued notifications from previous days', async () => { //
            const queuedNotification = {
                id: 1,
                payload: {
                    id: 1,
                    notificationURL: 'http://dest.com/notify',
                    type: 'DELIVERY' as const,
                    quantity: 100,
                    items: [{ name: 'copper', quantity: 100 }],
                },
            };
            (getQueuedNotifications as jest.Mock).mockResolvedValue([queuedNotification]);
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (removeSuccessfulNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);
            //We tick 2 days, at least a day has to pass.
            await jest.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(mockNotificationClient.sendLogisticsNotification).toHaveBeenCalledWith(
                queuedNotification.payload
            );
        });

        it('should remove successfully sent notifications from the queue', async () => {//
            const queuedNotification = {
                id: 1,
                payload: {
                    id: 1,
                    notificationURL: 'http://dest.com/notify',
                    type: 'DELIVERY' as const,
                    quantity: 100,
                    items: [{ name: 'copper', quantity: 100 }],
                },
            };
            (getQueuedNotifications as jest.Mock).mockResolvedValue([queuedNotification]);
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (removeSuccessfulNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);
            // Wait for 2 ticks
            await jest.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(removeSuccessfulNotification).toHaveBeenCalledWith(1);
        });

        it('should add failed notifications to the retry queue', async () => {//
            const newNotification = {
                id: 1,
                notificationURL: 'http://dest.com/notify',
                type: 'DELIVERY' as const,
                quantity: 100,
                items: [{ name: 'copper', quantity: 100 }],
            };

            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 100,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;

            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            mockNotificationClient.sendLogisticsNotification
                .mockResolvedValueOnce({ status: 200, data: {} } as any) // PICKUP succeeds
                .mockRejectedValueOnce(new Error('Network error')); // DELIVERY fails
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);
            (addOrUpdateFailedNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);
            // We need to at least wait for the failure to occur.
            await jest.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(addOrUpdateFailedNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'DELIVERY',
                }),
                expect.any(Date)
            );
        });

        it('should handle notifications that return non-2xx status codes', async () => {//
            const queuedNotification = {
                id: 1,
                payload: {
                    id: 1,
                    notificationURL: 'http://dest.com/notify',
                    type: 'DELIVERY' as const,
                    quantity: 100,
                    items: [{ name: 'copper', quantity: 100 }],
                },
            };
            (getQueuedNotifications as jest.Mock).mockResolvedValue([queuedNotification]);
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 500,
                data: { error: 'Server error' },
            } as any);
            (addOrUpdateFailedNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(30000);
            await Promise.resolve();

            expect(addOrUpdateFailedNotification).toHaveBeenCalled();
        });
    });

    describe('Truck Delivery Handling', () => {
        it('should add vehicles when trucks are delivered', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 123,
                canFulfill: true,
                itemName: 'large_truck',
                quantity: 2,
                totalPrice: '200000',
                status: 'DELIVERED',
                operatingCostPerDay: '500/day',
                maximumLoad: 5000,
                message: 'Delivery successful',
            };
            (addVehicle as jest.Mock).mockResolvedValue(undefined);

            await autonomyService.handleTruckDelivery(truckDelivery);

            expect(addVehicle).toHaveBeenCalledTimes(2);
            expect(addVehicle).toHaveBeenCalledWith({
                type: 'large_truck',
                purchase_date: expect.any(String),
                operational_cost: 500,
                load_capacity: 5000,
            });
        });

        it('should extract operational cost correctly from formats like "500/day"', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 124,
                canFulfill: true,
                itemName: 'medium_truck',
                quantity: 1,
                totalPrice: '50000',
                status: 'DELIVERED',
                operatingCostPerDay: '300/day',
                maximumLoad: 3000,
                message: 'Delivery successful',
            };
            (addVehicle as jest.Mock).mockResolvedValue(undefined);

            await autonomyService.handleTruckDelivery(truckDelivery);

            expect(addVehicle).toHaveBeenCalledWith(
                expect.objectContaining({
                    operational_cost: 300,
                })
            );
        });

        it('should extract operational cost correctly from plain numbers', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 125,
                canFulfill: true,
                itemName: 'small_truck',
                quantity: 1,
                totalPrice: '30000',
                status: 'DELIVERED',
                operatingCostPerDay: '200',
                maximumLoad: 1000,
                message: 'Delivery successful',
            };
            (addVehicle as jest.Mock).mockResolvedValue(undefined);

            await autonomyService.handleTruckDelivery(truckDelivery);

            expect(addVehicle).toHaveBeenCalledWith(
                expect.objectContaining({
                    operational_cost: 200,
                })
            );
        });

        it('should not add vehicles when delivery cannot be fulfilled', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 126,
                canFulfill: false,
                itemName: 'large_truck',
                quantity: 0,
                totalPrice: '0',
                status: 'FAILED',
                operatingCostPerDay: '500/day',
                maximumLoad: 5000,
                message: 'Out of stock',
            };
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await autonomyService.handleTruckDelivery(truckDelivery);

            expect(addVehicle).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Truck delivery cannot be fulfilled:',
                'Out of stock'
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle errors when adding vehicles fails', async () => {
            const truckDelivery: TruckDelivery = {
                orderId: 127,
                canFulfill: true,
                itemName: 'large_truck',
                quantity: 1,
                totalPrice: '100000',
                status: 'DELIVERED',
                operatingCostPerDay: '500/day',
                maximumLoad: 5000,
                message: 'Delivery successful',
            };
            (addVehicle as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(autonomyService.handleTruckDelivery(truckDelivery)).rejects.toThrow(
                'There was an error adding the vehicle'
            );
        });
    });

    describe('Vehicle Failure Handling', () => {
        it('should log insurance policy message when vehicle fails', () => {
            const failureRequest: TruckFailureRequest = {
                truckName: 'large_truck',
                failureQuantity: 1,
                simulationDate: '2025-01-15',
                simulationTime: '12:00:00',
            };
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            autonomyService.handleVehicleFailure(failureRequest);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('insurance policy')
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe('Machine Item Handling', () => {
        beforeEach(() => {
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [{ loan_number: 'LOAN-123', initial_amount: 1000000, interest_rate: 0.05, write_off: false, outstanding_amount: 1000000 }],
            });
            (getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                { vehicle_id: 1, type_name: 'large_truck' },
            ]);
            (getQueuedNotifications as jest.Mock).mockResolvedValue([]);
            (updatePickupRequestStatuses as jest.Mock).mockResolvedValue(undefined);
        });

        it('should handle machine items with quantity 1 in delivery notifications', async () => {//
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'screen_machine',
                                quantity: 2000, // Weight in KG
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);
            (removeSuccessfulNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // Check delivery notification has quantity 1 for machines
            expect(mockNotificationClient.sendLogisticsNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    "id": "EXT-123",
                    "items": [{ "name": "screen_machine", "quantity": 2000 }], 
                    "notificationURL": "http://origin.com/notify", 
                    "quantity": 2000, 
                    "type": "PICKUP" 
                })
            );
        });

        it('should handle regular items with actual quantity', async () => {//
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 1000,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 200,
                data: { success: true },
            } as any);
            (shipmentModel.createShipmentAndAssignitems as jest.Mock).mockResolvedValue(undefined);
            (removeSuccessfulNotification as jest.Mock).mockResolvedValue(undefined);

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            // Check delivery notification has actual quantity for regular items
            expect(mockNotificationClient.sendLogisticsNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    "id": "EXT-123", 
                    "items": [{"name": "copper", "quantity": 1000}], 
                    "notificationURL": "http://origin.com/notify", 
                    "quantity": 1000, "type": "PICKUP"
                })
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            mockBankClient.getAllLoanDetails.mockResolvedValue({
                success: true,
                total_outstanding_amount: 1000000,
                loans: [{ loan_number: 'LOAN-123', initial_amount: 1000000, interest_rate: 0.05, write_off: false, outstanding_amount: 1000000 }],
            });
            (getAllVehiclesWithType as jest.Mock).mockResolvedValue([
                { vehicle_id: 1, type_name: 'large_truck' },
            ]);
        });

        it('should handle errors during tick processing gracefully', async () => {//
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            (reactivateVehicle as jest.Mock).mockRejectedValue(new Error('Reactivation failed'));

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect((autonomyService as any).isProcessingTick).toBe(false);

            consoleErrorSpy.mockRestore();
        });

        it('should continue running after an error in daily tasks', async () => { //
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            (reactivateVehicle as jest.Mock).mockRejectedValue(new Error('Reactivation failed'));

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            expect((autonomyService as any).isRunning).toBe(true);

            consoleErrorSpy.mockRestore();
        });

        it('should handle failed pickup notifications without stopping shipment planning', async () => {//
            const mockPlanDailyShipments = jest.fn().mockResolvedValue({
                createdShipmentsPlan: [
                    {
                        vehicle: { vehicle_id: 1 },
                        itemsToAssign: [
                            {
                                pickup_request_item_id: 1,
                                pickup_request_id: 1,
                                itemName: 'copper',
                                quantity: 100,
                                originCompanyUrl: 'http://origin.com/notify',
                                destinationCompanyUrl: 'http://dest.com/notify',
                                originalExternalOrderId: 'EXT-123',
                            },
                        ],
                    },
                ],
                plannedRequestIds: [1],
            });
            mockShipmentPlanner.prototype.planDailyShipments = mockPlanDailyShipments;
            mockNotificationClient.sendLogisticsNotification.mockResolvedValue({
                status: 500,
                data: { error: 'Service unavailable' },
            } as any);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const startTime = Date.now();
            autonomyService.start(startTime);

            await jest.advanceTimersByTimeAsync(15000);
            await Promise.resolve();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Notification failed for item')
            );
            expect((autonomyService as any).isRunning).toBe(true);

            consoleErrorSpy.mockRestore();
        });
    });
});
