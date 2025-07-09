import { ShipmentPlannerService } from "./ShipmentPlannerService";
import { shipmentModel } from "../models/shipment";
import { updateCompletionDate, updatePickupRequestStatuses } from "../models/pickupRequestRepository";
import { PickupToShipmentItemDetails } from "../types";
import { Item, LogisticNotificationsGrouped, LogisticsNotification } from "../types/notifications";

import { thohApiClient } from "../client/thohClient";
import { addVehicle } from "../models/vehicle";
import type { TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
import { timer } from "rxjs";

const SIMULATION_TICK_INTERVAL_MS = 3000; // should be set to 2 minutes, is on 15 seconds for testing

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
            { truckName: "small", quantity: 3 },
        ];

        const truckPriceMap: { [key: string]: number } = {};

        const trucksInfo = await thohApiClient.getTrucksInformation();

        trucksInfo.forEach((truck) => {
            truckPriceMap[truck.truckName] = truck.price;
        });

        const trucksCost = requiredTrucks.reduce((overallCost, truck) => {
            return (overallCost += truckPriceMap[truck.truckName] * truck.quantity);
        }, 0);

        //4. Request Loan

        //5. Purchase trucks
        const truckPurchasePromises: Promise<TruckPurchaseResponse | undefined>[] = [];
        requiredTrucks.forEach((truckInfo) => {
            truckPurchasePromises.push(this._checkAndPurchaseTrucks(truckInfo));
        });

        // Wait for all the started operations to complete
        const purchasedTrucks = await Promise.all(truckPurchasePromises);

        for (const truck of purchasedTrucks) {
            // Make sure the truck data is valid before saving
            if (truck) {
                await addVehicle({
                    type: truck.truckName,
                    purchase_date: this.currentSimulatedDate.toISOString(),
                    operational_cost: Number(truck.operatingCostPerDay.split("/")[0]), // THOH should change this to a number
                    load_capacity: truck.maximumLoad,
                });
            }
        }
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
            //await this._checkAndPurchaseTrucks(); // Insert logic for first day operations.

            // --- Regular Daily Operations ---
            const notificationDetails = await this._planAndDispatchShipments();

            await this._notifyPickedUpDeliveries(notificationDetails.pickups);
            const delayedObservable = timer(10000);
            const subscription =  delayedObservable.subscribe({
                next: async () => {
                    console.log("10 seconds have passed!!!!")
                    await this._notifyCompletedDeliveries(notificationDetails.dropoffs);
                }
                });
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
    private async _checkAndSecureLoan(): Promise<void> {
        // TODO: Replace this with our actual business logic.
        const needsLoan = !this.hasActiveLoan;

        if (needsLoan) {
            try {
                console.log("Condition met: Applying for a loan...");
                // const loanResult = await BankApiClient.applyForLoan({ amount: 500000 });
                this.hasActiveLoan = true; // Update state upon success
                console.log("Loan approved and state updated.");
            } catch (error) {
                console.error("Failed to secure a loan.", error);
                // Decide if this is a critical failure that should stop the tick.
            }
        }
    }

    /**
     * Checks if new trucks are needed and purchases them if conditions are met.
     */
    private async _checkAndPurchaseTrucks(truckInfo: TruckPurchaseRequest): Promise<TruckPurchaseResponse | undefined> {
        // This check will only run if we have a loan to pay for the trucks.
        if (!this.hasActiveLoan) {
            // should be modified to check available funds as well, assuming we might need to buy trucks from our own funds once accumulated enough
            const loanRequest = await this._checkAndSecureLoan();

            // if (loanRequest.data && this.hasActiveLoan) {
            //     // To be updated once loan request has been implemented
            //     return await this._checkAndPurchaseTrucks(truckInfo); // try purchasing the truck/s again
            // }
        }

        try {
            console.log("Condition met: Purchasing initial fleet of trucks...");
            const purchaseResult = await thohApiClient.purchaseTruck(truckInfo);
            this.truckCount += purchaseResult.quantity; // Update state upon success

            return purchaseResult;
        } catch (error) {
            console.error("Failed to purchase trucks.", error);
        }
    }

    /**
     * Finds paid pickup requests and assigns vehicles to them.
     */
    private async _planAndDispatchShipments(): Promise<LogisticNotificationsGrouped> {
        console.log("Morning Ops: Planning and dispatching shipments...");
        const planner = new ShipmentPlannerService();
        let dropoffEntities: LogisticsNotification[] = [];
        let pickupEntities: LogisticsNotification[] = [];
        const { createdShipmentsPlan, plannedRequestIds } = await planner.planDailyShipments(this.currentSimulatedDate);
        for (const plan of createdShipmentsPlan) {
            try {
                const newShipment = await shipmentModel.createShipment(plan.vehicle.vehicle_id, this.currentSimulatedDate);

                for (const item of plan.itemsToAssign) {
                    await shipmentModel.assignItemToShipmentWithPickupRequestItemId(item.pickup_request_item_id, newShipment.shipment_id);
                }

                for (const id in plannedRequestIds) {
                    await updateCompletionDate(+id, this.currentSimulatedDate);
                }
                console.log(`PICKUP: Notifying ${plan.originCompanyName} that items for shipment ${newShipment.shipment_id} have been collected.`);

            } catch (error) {
                console.error(`Failed to commit shipment plan for vehicle ${plan.vehicle.vehicle_id}.`, error);
            }
            plan.itemsToAssign.forEach(item => {
                console.log(item.originCompanyUrl);
                pickupEntities.push({
                    id: item.originalExternalOrderId,
                    notificationURL: item.originCompanyUrl,
                    type: 'PICKUP',
                    items: [
                        {
                            name: item.itemName,
                            quantity: item.quantity
                        }
                    ]
                });
                dropoffEntities.push({
                    id: item.pickup_request_id,
                    notificationURL: item.destinationCompanyUrl,
                    type: 'DELIVERY',
                    items: [
                        {
                            name: item.itemName,
                            quantity: item.quantity
                        }
                    ]
                });
            }
            );

        }
        return {dropoffs: dropoffEntities, pickups: pickupEntities};
    }

    /**
     * Notifies destination companies that their goods have arrived.
     */
    private async _notifyCompletedDeliveries(notifications: LogisticsNotification[]): Promise<void> {
        console.log("Evening Ops: Notifying completed deliveries...");
        // TODO: instead of logging, we hit the client.
        // then update all our pickup requests' completedDates
        await updatePickupRequestStatuses(this.currentSimulatedDate);
        console.log("Dropped Off",notifications)
    }

    private async _notifyPickedUpDeliveries(notifications: LogisticsNotification[]): Promise<void> {
        console.log("Morning Ops: Notifying picked up deliveries...");
        // TODO: instead of logging, we hit the client.
        console.log("Picked up:",notifications);
        // then update all our pickup requests' completedDates
        //await updatePickupRequestStatuses(this.currentSimulatedDate);
    }
}

export const autonomyService = AutonomyService.getInstance();
