import { ShipmentPlannerService } from "./ShipmentPlannerService";
import { shipmentModel } from "../models/shipment";
import { updateCompletionDate } from "../models/pickupRequestRepository";

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
            5. We purchase our trucks-> for now we assume that they will delivred instanbtly (info in the response) but we can only use them on the next day.
                    Create trucks, set active to false, until they are "eligible", then we set active to true. 
        */
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
            await this._checkAndPurchaseTrucks(); // Insert logic for first day operations.

            // --- Regular Daily Operations ---
            await this._planAndDispatchShipments();
            await this._notifyCompletedDeliveries();
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
    private async _checkAndPurchaseTrucks(): Promise<void> {
        // This check will only run if we have a loan to pay for the trucks.
        if (!this.hasActiveLoan) {
            return;
        }
        // If we dont have a loan, lets get another one and get more trucks. Maybe we should keep track of our profit somewhere lol.

        // TODO: Replace this with our actual business logic.
        const needsTrucks = this.truckCount < 5;

        if (needsTrucks) {
            try {
                console.log("Condition met: Purchasing initial fleet of trucks...");
                // const purchaseResult = await ThohApiClient.purchaseTrucks({ count: 5 });
                this.truckCount = 5; // Update state upon success
                console.log("Trucks purchased and state updated.");
            } catch (error) {
                console.error("Failed to purchase trucks.", error);
            }
        }
    }

    /**
     * Finds paid pickup requests and assigns vehicles to them.
     */
    private async _planAndDispatchShipments(): Promise<void> {
        console.log("Morning Ops: Planning and dispatching shipments...");
        
        const planner = new ShipmentPlannerService();
        
        // 1. Call the planner to get the calculated plan for the day.
        const {createdShipmentsPlan, plannedRequestIds} = await planner.planDailyShipments(this.currentSimulatedDate); 
        // 2. Execute the plan: Loop through the returned plans and commit to DB.
        for (const plan of createdShipmentsPlan) {
            try {
                // a. Create the main shipment record
                const newShipment = await shipmentModel.createShipment(plan.vehicle.vehicle_id, this.currentSimulatedDate);

                // b. Assign all items for this shipment
                for (const item of plan.itemsToAssign) {
                    await shipmentModel.assignItemToShipmentWithPickupRequestItemId(item.pickup_request_item_id, newShipment.shipment_id);
                }

                for (const id in plannedRequestIds){
                    await updateCompletionDate(+id, this.currentSimulatedDate);
                }
                // c. Log the pickup notification (replaces API call)
                console.log(`PICKUP: Notifying ${plan.originCompanyName} that items for shipment ${newShipment.shipment_id} have been collected.`);

            } catch (error) {
                console.error(`Failed to commit shipment plan for vehicle ${plan.vehicle.vehicle_id}.`, error);
                // Continue to the next plan even if one fails.
            }
        }
    }

    /**
     * Notifies destination companies that their goods have arrived.
     */
    private async _notifyCompletedDeliveries(): Promise<void> {
        console.log("Evening Ops: Notifying completed deliveries...");
        // Logic for this would go here...
    }
}

// Export a single instance to be used throughout the application.
export const autonomyService = AutonomyService.getInstance();
