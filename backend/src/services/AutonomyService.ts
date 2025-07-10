import { ShipmentPlannerService } from "./ShipmentPlannerService";
import { shipmentModel } from "../models/shipment";
import { updateCompletionDate, updatePickupRequestStatuses } from "../models/pickupRequestRepository";
import { PickupToShipmentItemDetails, TransactionResponse, TruckDelivery, type LoanApplicationResponse } from "../types";
import { Item, LogisticNotificationsGrouped, LogisticsNotification } from "../types/notifications";
import { notificationApiClient } from "../client/notificationClient";
import { thohApiClient } from "../client/thohClient";
import { addVehicle } from "../models/vehicle";
import type { TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
import { lastValueFrom, timer } from "rxjs";
import { bankApiClient } from "../client/bankClient";
import { TransactionCategory } from "../enums";

const SIMULATION_TICK_INTERVAL_MS = 15000; // should be set to 2 minutes, is on 15 seconds for testing

export default class AutonomyService {
    private static instance: AutonomyService;

    // --- State Properties ---
    private isRunning: boolean = false;
    private isProcessingTick: boolean = false;
    private currentSimulatedDate: Date = new Date("2050-01-01");
    private tickIntervalId: NodeJS.Timeout | null = null;
    private hasActiveLoan: boolean = false; // Example state property
    private truckCount: number = 0; // Example state property
    private isFirstDay: boolean = true;
    private funds: number = 0; // Will need an SQL statement for this.
    private initialTrucksCost: number = 0; // This will be set after calculating the cost of trucks from the HAND.

    private constructor() {
        console.log("AutonomyService instance created.");
    }

    private resetState() {
        this.isRunning = false;
        this.isProcessingTick = false;
        this.currentSimulatedDate = new Date("2050-01-01");
        this.tickIntervalId = null;
        this.hasActiveLoan = false;
        this.truckCount = 0;
        this.isFirstDay = true;
        this.funds = 0;
        this.initialTrucksCost = 0;
    }

    // This is necessary to make it a singleton.
    public static getInstance(): AutonomyService {
        if (!AutonomyService.instance) {
            AutonomyService.instance = new AutonomyService();
        }
        return AutonomyService.instance;
    }

    /**
     * Starts the simulation's daily tick timer.
     */
    public start(initialData: any): void {
        if (this.isRunning) {
            console.warn("Simulation is already running. Start command ignored.");
            return;
        }

        console.log("--- SIMULATION STARTING ---", initialData);
        this.isRunning = true;

        // Immediately perform the first day's tick, then set the interval.
        this._performDailyTick();
        // This is how we keep track of time. The "cron" job waits on this interval rather than acting on actual system time.
        this.tickIntervalId = setInterval(() => this._performDailyTick(), SIMULATION_TICK_INTERVAL_MS);

        console.log("AutonomyService started. Daily ticks will occur every 2 minutes.");
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

    public handleVehicleCrash(): void {
        console.log(
            "We have an insurance policy with Hive Insurance Co. Our policy dictates that all lost goods from a failed shipment will be replaced, and delivered on the same day! All surviving goods are thrown away since they were in a crash. Hooray! Everyone wins!!",
        );
    }

    public async handleTruckDelivery(truckDelivery: TruckDelivery): Promise<void> {
        if (truckDelivery && truckDelivery.canFulfill) {
            for (let i = 0; i < truckDelivery.quantity; i++) {
                await addVehicle({
                    type: truckDelivery.itemName,
                    purchase_date: this.currentSimulatedDate.toISOString().split("T")[0], // we can not put the actual purchase date unless if the HAND API provides it
                    operational_cost: truckDelivery.operatingCostPerDay,
                    load_capacity: truckDelivery.maximumLoad,
                });
            }
        } else {
            console.error("Truck delivery cannot be fulfilled:", truckDelivery.message);
            // Handle the case where the truck delivery cannot be fulfilled.
            // This could involve logging, notifying the user, or taking other actions.
        }
    }

    // ========================================================================
    // PRIVATE HELPER METHODS (The "Cron Job" Logic)
    // ========================================================================

    private async _onInitOperations(): Promise<void> {
        /* 
            1. Create bank account (assume instant) -> bank account created (bankClient). update company table with our account number.
            2. Provide bank with our notification endpoint url either in the creation request or that dubious notification endpoint
            3. Figure out cost of [3 large, 3 medium, 3 small] vehicles from the hand (handClient) -> we have our needed loan amount.
            4. We request a loan. If we get a success then -> update transaction ledger + loan table.  (bank will debit us)
            RESPONSE WILL LOOK LIKE THIS FOR LOAN:
                ========interface LoanResult {
                ============loan_number: string;
                ============initial_transaction_id: number;
                ============interest_rate: number;
                ============started_at: string;
                ============write_off: boolean;
                ========}
            5. We purchase our trucks-> for now we assume that they will delivered instantly (info in the response) but we can only use them on the next day.
                    Create trucks, set active to false, until they are "eligible", then we set active to true. 
        */

        //3. Figure out cost of [3 large, 3 medium, 3 small] vehicles from the hand (handClient) -> we have our needed loan amount.
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

        //4. Request Loan
        const totalLoanAmount = requiredTrucks.reduce((total, truckInfo) => {
            const price = truckPriceMap[truckInfo.truckName];
            return total + price * truckInfo.quantity;
        }, 0);

        const isLoanApplicationSuccessful = await this._checkAndSecureLoan(totalLoanAmount  * 2);

        if (isLoanApplicationSuccessful) {
            const accountBalance = await bankApiClient.getBalance();
            this.funds = accountBalance.balance;
        }

        //5. Purchase trucks
        const truckPurchasePromises: Promise<TruckPurchaseResponse | undefined>[] = [];
        requiredTrucks.forEach((truckInfo) => {
            truckPurchasePromises.push(this._checkAndPurchaseTrucks(truckInfo));
        });

        const trucksPurchaseResponse = await Promise.all(truckPurchasePromises);

        const trucksPurchasePaymentsPromises: Promise<TransactionResponse>[] = [];

        trucksPurchaseResponse.forEach((response) => {
            if (response && response.orderId) {
                trucksPurchasePaymentsPromises.push(
                    bankApiClient.makePayment({
                        paymentDetails: {
                            to_account_number: response.bankAccount,
                            to_bank_name: "commercial-bank",
                            amount: response.price * response.quantity, // THOH to provide the overall price in the response
                            description: String(response.orderId),
                        },
                        transactionCategory: TransactionCategory.Purchase,
                    }),
                );
            } else {
                console.log("Truck purchase response was undefined or missing orderId. Skipping payment.");
            }
        });

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
     * The main "cron job" that runs on every interval.
     */
    private async _performDailyTick(): Promise<void> {
        if (this.isProcessingTick) {
            console.warn("Previous tick is still processing. Skipping new tick.");
            return;
        }

        this.isProcessingTick = true;
        console.log(`\n--- Starting Daily Tick for: ${this.currentSimulatedDate.toISOString().split("T")[0]} ---`);

        try {
            /**
             * 1. Check the account balance and update our funds accordingly.
             * 2. Check if trucks are available after purchase. check vehicles table for vehicles created the previous day and with is_active FALSE update is_active to true.
             * 3. Do pick ups (assign pickup request items to shipments)
             * 4. Assign pickup requests to different shipments
             * 5. Wait until 30 seconds until 'midnight' and deliver (still under consideration)
             * 6. based on our shipments (trucks used in the day), we pay operational costs to the hand.
             */

            // --- Condition-Based Setup Tasks ---
            // These now run at the start of each day to check if they are needed.
            await this._checkAndSecureLoan(); // Insert logic for first day operations.

            // --- Regular Daily Operations ---
            const dropOffDetails = await this._planAndDispatchShipments();

            // Create an observable that emits after the delay
            const delayedObservable = timer(10000); // Represents the time until evening

            // Await the completion of the observable
            await lastValueFrom(delayedObservable);

            // Now that the wait is over, perform the deliveries
            await this._notifyCompletedDeliveries(dropOffDetails);
        } catch (error) {
            console.error("FATAL ERROR during daily tick.", error);
        } finally {
            this.isProcessingTick = false;
            // Advance the simulated day AFTER the tick is complete.
            this.currentSimulatedDate.setDate(this.currentSimulatedDate.getDate() + 1);
            console.log(`--- Finished Daily Tick. Next tick will be for ${this.currentSimulatedDate.toISOString().split("T")[0]} ---`);
        }
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
        // This check will only run if we have a loan to pay for the trucks.
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
                this.truckCount += purchaseResult.quantity; // Update state upon success

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
        const { createdShipmentsPlan, plannedRequestIds } = await planner.planDailyShipments(this.currentSimulatedDate);
        for (const plan of createdShipmentsPlan) {
            plan.itemsToAssign.forEach(async (item) => {
                let pickupRequestNotification: LogisticsNotification = {
                    id: item.originalExternalOrderId,
                    notificationURL: item.originCompanyUrl,
                    type: "PICKUP",
                    items: [
                        {
                            name: item.itemName,
                            quantity: item.quantity,
                        },
                    ],
                };
                const response = await notificationApiClient.sendLogisticsNotification(pickupRequestNotification);
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const newShipment = await shipmentModel.createShipment(plan.vehicle.vehicle_id, this.currentSimulatedDate);

                        for (const item of plan.itemsToAssign) {
                            await shipmentModel.assignItemToShipmentWithPickupRequestItemId(item.pickup_request_item_id, newShipment.shipment_id);
                        }

                        for (const id in plannedRequestIds) {
                            await updateCompletionDate(+id, this.currentSimulatedDate);
                        }

                        dropoffEntities.push({
                            id: item.pickup_request_id,
                            notificationURL: item.destinationCompanyUrl,
                            type: "DELIVERY",
                            items: [
                                {
                                    name: item.itemName,
                                    quantity: item.quantity,
                                },
                            ],
                        });
                    } catch (error) {
                        console.error(`Failed to commit shipment plan for vehicle ${plan.vehicle.vehicle_id}.`, error);
                    }
                } else {
                    return;
                }
            });
        }
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        return dropoffEntities;
    }

    /**
     * Notifies destination companies that their goods have arrived.
     */
    private async _notifyCompletedDeliveries(notifications: LogisticsNotification[]): Promise<void> {
        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\nEvening Ops: Notifying completed deliveries...");

        notifications.forEach(async (notification) => {
            await notificationApiClient.sendLogisticsNotification(notification);
        });

        await updatePickupRequestStatuses(this.currentSimulatedDate);
        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    }
}

export const autonomyService = AutonomyService.getInstance();
