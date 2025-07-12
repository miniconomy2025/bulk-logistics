import { ShipmentPlannerService } from "./ShipmentPlannerService";
import { shipmentModel } from "../models/shipmentRepository";
import { updateCompletionDate, updatePickupRequestStatuses } from "../models/pickupRequestRepository";
import { TransactionResponse, TruckDelivery } from "../types";
import { LogisticsNotification } from "../types/notifications";
import { notificationApiClient } from "../client/notificationClient";
import { thohApiClient } from "../client/thohClient";
import { addVehicle } from "../models/vehicleRepository";
import type { TruckFailureRequest, TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
import { bankApiClient } from "../client/bankClient";
import { TransactionCategory } from "../enums";
import { reactivateVehicle } from "./vehicleService";
import { updateCompanyDetails } from "../models/companyRepository";
import { SimulatedClock, simulatedClock } from "../utils";

const TICK_CHECK_INTERVAL_MS = 15000;

export default class AutonomyService {
    private static instance: AutonomyService;

    // --- State Properties ---
    private isRunning: boolean = false;
    private isProcessingTick: boolean = false;
    private tickIntervalId: NodeJS.Timeout | null = null;
    private hasActiveLoan: boolean = false;
    private funds: number = 0;
    private initialTrucksCost: number = 0;
    private lastProcessedSimDate: string | null = null;

    private constructor() {
        console.log("AutonomyService instance created.");
    }

    private resetState() {
        this.isRunning = false;
        this.isProcessingTick = false;
        this.tickIntervalId = null;
        this.hasActiveLoan = false;
        this.funds = 0;
        this.initialTrucksCost = 0;
    }

    public static getInstance(): AutonomyService {
        if (!AutonomyService.instance) {
            AutonomyService.instance = new AutonomyService();
        }
        return AutonomyService.instance;
    }

    /**
     * Starts the simulation's daily tick timer.
     */
    public start(startTime: number): void {
        if (this.isRunning) {
            console.warn("Simulation is already running. Start command ignored.");
            return;
        }

        simulatedClock.initialize(startTime);
        console.log("--- SIMULATION STARTING ---", "\n Real Time:", startTime, "\nSimulation Time:", simulatedClock.getCurrentDate());
        this.isRunning = true;

        this.tickIntervalId = setInterval(() => this._processTick(), TICK_CHECK_INTERVAL_MS);
        console.log(`AutonomyService started. Will check for a new day every ${TICK_CHECK_INTERVAL_MS / 1000} seconds.`);
    }

    /**
     * Stops the simulation.
     */
    public stop(): void {
        if (!this.isRunning) {
            console.warn("Simulation is not running. Stop command ignored.");
            return;
        }

        console.log("--- SIMULATION STOPPING ---");
        this.isRunning = false;
        // Reset the timer.
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
        }
        this.resetState();

        console.log("AutonomyService stopped.");
    }

    public reset(initialData: any): void {
        if (!this.isRunning) {
            console.warn("Simulation is not running. Stop command ignored.");
            return;
        }
        console.log("Resetting the simulation...");
        this.stop();
        this.start(initialData);
    }

    private async _processTick(): Promise<void> {
        if (this.isProcessingTick || !this.isRunning) {
            return;
        }

        try {
            const trueSimulatedDate = simulatedClock.getCurrentDate();
            const todayStr = trueSimulatedDate.toISOString().split("T")[0];

            if (todayStr !== this.lastProcessedSimDate) {
                this.isProcessingTick = true;

                // If this is the very first tick, run the one-time setup.
                if (this.lastProcessedSimDate === null) {
                    await this._onInitOperations();
                }

                // Run all tasks for this new day
                await this._performDailyTasks(trueSimulatedDate);

                this.lastProcessedSimDate = todayStr;

                this.isProcessingTick = false;
            }
        } catch (error) {
            console.error("Error during tick processing:", error);
            this.isProcessingTick = false;
        }
    }

    private async _performDailyTasks(forDate: Date): Promise<void> {
        console.log(`\n--- Starting Daily Tasks for: ${forDate.toISOString().split("T")[0]} ---`);

        try {
            const response = await reactivateVehicle();
            console.log(`---${response.message}---`);
            console.log(`${response.success && response.data}`);

            const dropOffDetails = await this._planAndDispatchShipments();

            await new Promise(resolve => setTimeout(resolve, SimulatedClock.SIMULATED_DAY_IN_REAL_MS * (2 / 3)));

            await this._notifyCompletedDeliveries(dropOffDetails);
        } catch (error) {
            console.error(`FATAL ERROR during daily tasks for ${forDate.toISOString().split("T")[0]}.`, error);
        } finally {
            console.log(`--- Finished Daily Tasks for ${forDate.toISOString().split("T")[0]} ---`);
        }
    }

    public handleVehicleFailure(failureRequest: TruckFailureRequest): void {
        console.log(
            "We have an insurance policy with Hive Insurance Co. Our policy dictates that all lost goods from a failed shipment will be replaced, and delivered on the same day! All surviving goods are thrown away since they were in a crash. Hooray! Everyone wins!!",
        );
    }

    public async handleTruckDelivery(truckDelivery: TruckDelivery): Promise<void> {
        if (truckDelivery && truckDelivery.canFulfill) {
            for (let i = 0; i < truckDelivery.quantity; i++) {
                try {
                    await addVehicle({
                        type: truckDelivery.itemName,
                        purchase_date: simulatedClock.getCurrentDate().toISOString().split("T")[0],
                        operational_cost: truckDelivery.operatingCostPerDay,
                        load_capacity: truckDelivery.maximumLoad,
                    });
                } catch (error) {
                    throw new Error("There was an error adding the vehicle");
                }
            }
        } else {
            console.error("Truck delivery cannot be fulfilled:", truckDelivery.message);
        }
    }

    // ========================================================================
    // PRIVATE HELPER METHODS (The "Cron Job" Logic)
    // ========================================================================

    private async _onInitOperations(): Promise<void> {
        const bankAccount = await bankApiClient.getAccountDetails();
        let accountNumber: string;

        //1. Create bank account, send the notification URL to the bank
        if (!bankAccount.success) {
            const accountCreationResponse = await bankApiClient.createAccount("https://bulk-logistics-api.projects.bbdgrad.com/api/bank");

            accountNumber = accountCreationResponse.account_number;
        } else {
            accountNumber = bankAccount.account_number;
        }

        if (accountNumber) {
            await updateCompanyDetails("bulk-logistics", {
                bankAccountNumber: accountNumber,
            });
        }
        //2. Figure out cost of [3 large, 3 medium, 3 small] vehicles from the hand
        const requiredTrucks: TruckPurchaseRequest[] = [
            { truckName: "large_truck", quantity: 3 },
            { truckName: "medium_truck", quantity: 3 },
            { truckName: "small_truck", quantity: 3 },
        ];

        const truckPriceMap: { [key: string]: number } = {};

        const trucksInfo = await thohApiClient.getTrucksInformation();

        trucksInfo.forEach((truck) => {
            truckPriceMap[truck.truckName] = truck.price;
        });

        //3. Request Loan
        const totalLoanAmount = requiredTrucks.reduce((total, truckInfo) => {
            const price = truckPriceMap[truckInfo.truckName];
            return total + price * truckInfo.quantity;
        }, 0);

        const isLoanApplicationSuccessful = await this._checkAndSecureLoan(totalLoanAmount * 2);

        if (isLoanApplicationSuccessful) {
            const accountBalance = await bankApiClient.getBalance();
            this.funds = accountBalance.net_balance;
            console.log(
                "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\nLoan secured successfully. Funds available:\n",
                this.funds,
            );
        }

        // 4. Purchase trucks
        const truckPurchasePromises: Promise<TruckPurchaseResponse | undefined>[] = [];
        requiredTrucks.forEach((truckInfo) => {
            truckPurchasePromises.push(this._checkAndPurchaseTrucks(truckInfo));
        });

        const trucksPurchaseResponse = await Promise.all(truckPurchasePromises);

        const trucksPurchasePaymentsPromises: Promise<TransactionResponse>[] = [];

        const firstResponse = trucksPurchaseResponse[0];

        if (firstResponse && firstResponse.orderId) {
            await updateCompanyDetails("thoh", {
                bankAccountNumber: firstResponse.bankAccount,
            });

            trucksPurchasePaymentsPromises.push(
                bankApiClient.makePayment({
                    paymentDetails: {
                        to_account_number: firstResponse.bankAccount,
                        to_bank_name: "commercial-bank",
                        amount: firstResponse.price * firstResponse.quantity,
                        description: String(firstResponse.orderId),
                    },
                    transactionCategory: TransactionCategory.Purchase,
                }),
            );
        } else {
            console.log("First truck purchase response was undefined or missing orderId. Skipping payment.");
        }
        const paymentResults = await Promise.all(trucksPurchasePaymentsPromises);

        paymentResults.forEach((result) => {
            if (result.success) {
                console.log(`Payment successful for transaction: ${result.transaction_number}`);
            } else {
                console.error("Payment failed:", result);
            }
        });
    }

    /**
     * Checks if a loan is needed and applies for one if conditions are met.
     */
    private async _checkAndSecureLoan(amount: number): Promise<boolean> {
        const needsLoan = !this.hasActiveLoan;

        if (needsLoan) {
            try {
                const loanApplicationResponse = await bankApiClient.applyForLoan({ amount });

                this.hasActiveLoan = loanApplicationResponse.success;
                return this.hasActiveLoan;
            } catch (error) {
                console.error("Failed to secure a loan.", error);
            }
        }

        return false;
    }

    /**
     * Checks if new trucks are needed and purchases them if conditions are met.
     */
    private async _checkAndPurchaseTrucks(truckInfo: TruckPurchaseRequest): Promise<TruckPurchaseResponse | undefined> {
        if (!this.hasActiveLoan || this.funds === 0) {
            const isLoanSecured = await this._checkAndSecureLoan(this.initialTrucksCost * 2);

            if (isLoanSecured) {
                return await this._checkAndPurchaseTrucks(truckInfo);
            } else {
                console.error("Failed to secure a loan for truck purchase. Cannot proceed.");
                return;
            }
        } else {
            try {
                const purchaseResult = await thohApiClient.purchaseTruck(truckInfo);

                return purchaseResult;
            } catch (error) {
                console.error("Failed to purchase trucks.", error);
            }
        }
    }

    /**
     * Finds paid pickup requests and assigns vehicles to them.
     */
    private async _planAndDispatchShipments(): Promise<LogisticsNotification[]> {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nMorning Ops: Planning and dispatching shipments...");
        const planner = new ShipmentPlannerService();
        let dropoffEntities: LogisticsNotification[] = [];
        const { createdShipmentsPlan, plannedRequestIds } = await planner.planDailyShipments();
        for (const plan of createdShipmentsPlan) {
            try {
                for (const item of plan.itemsToAssign) {
                    const pickupRequestNotification: LogisticsNotification = {
                        id: item.originalExternalOrderId,
                        notificationURL: item.originCompanyUrl,
                        type: "PICKUP",
                        quantity: item.quantity,
                        items: [
                            {
                                name: item.itemName,
                                quantity: item.quantity,
                            },
                        ],
                    };
                    const response = await notificationApiClient.sendLogisticsNotification(pickupRequestNotification);
                    if (response.status >= 200 && response.status < 300) {
                        
                        await shipmentModel.createShipmentAndAssignitems(plan.vehicle.vehicle_id, item.pickup_request_item_id, plannedRequestIds);

                        dropoffEntities.push({
                            id: item.pickup_request_id,
                            notificationURL: item.destinationCompanyUrl,
                            type: "DELIVERY",
                            quantity: item.quantity,
                            items: [
                                {
                                    name: item.itemName,
                                    quantity: item.quantity,
                                },
                            ],
                        });
                    } else {
                        console.error(`Notification failed for item ${item.itemName} with status: ${response.status}`);
                    }
                }
            } catch (error) {
                console.error(`Failed to commit shipment plan for vehicle ${plan.vehicle.vehicle_id}.`, error);
            }
        }
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        return dropoffEntities;
    }

    /**
     * Notifies destination companies that their goods have arrived.
     */
    private async _notifyCompletedDeliveries(notifications: LogisticsNotification[]): Promise<void> {
        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\nEvening Ops: Notifying completed deliveries...");

        const notificationPromises = notifications.map(notification =>
            notificationApiClient.sendLogisticsNotification(notification)
        );

        await Promise.all(notificationPromises);

        await updatePickupRequestStatuses(simulatedClock.getCurrentDate());

        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    }
}

export const autonomyService = AutonomyService.getInstance();
