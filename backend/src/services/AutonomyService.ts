import { ShipmentPlannerService } from "./ShipmentPlannerService";
import { shipmentModel } from "../models/shipmentRepository";
import { updateCompletionDate, updatePickupRequestStatuses } from "../models/pickupRequestRepository";
import { AllLoansInfoResponse, ItemDefinitionWithName, TransactionResponse, TruckDelivery, VehicleWithType } from "../types";
import { LogisticsNotification } from "../types/notifications";
import { notificationApiClient } from "../client/notificationClient";
import { thohApiClient } from "../client/thohClient";
import { addVehicle, findAllVehiclesWithShipments, getAllVehiclesWithType } from "../models/vehicleRepository";
import type { TruckFailureRequest, TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
import { bankApiClient } from "../client/bankClient";
import { ShipmentStatus, TransactionCategory } from "../enums";
import { reactivateVehicle } from "./vehicleService";
import { getCompanyByName, updateCompanyDetails } from "../models/companyRepository";
import { SimulatedClock, simulatedClock } from "../utils";
import { addOrUpdateFailedNotification, getQueuedNotifications, removeSuccessfulNotification } from "../models/notificationsQueueRepository";
import { getItemDefinitions } from "../models/pickupRequestItemRepository";
import shipmentStatus from "../models/shipmentStatus";
import shipmentProcessingService from "./shipmentProcessingService";

const TICK_CHECK_INTERVAL_MS = 15000;

// Configuration constants
const REQUIRED_INITIAL_TRUCKS: TruckPurchaseRequest[] = [
    { truckName: "large_truck", quantity: 4 },
    { truckName: "medium_truck", quantity: 4 },
];
const BANK_NOTIFICATION_URL = "https://team7-todo.xyz/api/bank";
const LOAN_MULTIPLIER = 2; // Request loan at 2x truck cost
const COMPANY_NAME = "bulk-logistics";
const THOH_COMPANY_NAME = "thoh";

export default class AutonomyService {
    private static instance: AutonomyService;

    // --- State Properties ---
    private isRunning: boolean = false;
    private isProcessingTick: boolean = false;
    private tickIntervalId: NodeJS.Timeout | null = null;
    private hasActiveLoan: boolean = false;
    private initialTrucksSecured: boolean = false;
    private funds: number | undefined = 0;
    private initialTrucksCost: number = 0;
    private lastProcessedSimDate: string | null = null;
    private bankAccountSecured: boolean = false;

    private constructor() {
        console.log("AutonomyService instance created.");
    }

    private resetState() {
        this.isRunning = false;
        this.isProcessingTick = false;
        this.tickIntervalId = null;
        this.hasActiveLoan = false;
        this.initialTrucksSecured = false;
        this.bankAccountSecured = false;
        this.funds = 0;
        this.initialTrucksCost = 0;
        this.lastProcessedSimDate = null;
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

        this.tickIntervalId = setInterval(() => this.processTick(), TICK_CHECK_INTERVAL_MS);
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

    private async processTick(): Promise<void> {
        if (this.isProcessingTick || !this.isRunning) {
            return;
        }

        try {
            const trueSimulatedDate = simulatedClock.getCurrentDate();
            const todayStr = trueSimulatedDate.toISOString().split("T")[0];

            if (todayStr !== this.lastProcessedSimDate) {
                this.isProcessingTick = true;

                // If initialization is incomplete, run the one-time setup
                if (!this.initialTrucksSecured || !this.hasActiveLoan || !this.bankAccountSecured) {
                    console.log("Initialization incomplete. Running initialization operations...");
                    await this.onInitOperations();
                }

                // Only run daily tasks if initialization is complete
                if (this.initialTrucksSecured && this.hasActiveLoan && this.bankAccountSecured) {
                    console.log("Initialization complete. Running daily tasks...");
                    await this.performDailyTasks(trueSimulatedDate);

                    // Only update lastProcessedSimDate after successfully running daily tasks
                    this.lastProcessedSimDate = todayStr;
                } else {
                    console.warn("Initialization still incomplete. Skipping daily tasks. Will retry initialization on next tick (every 15 seconds).");
                }

                this.isProcessingTick = false;
            }
        } catch (error) {
            console.error("Error during tick processing:", error);
            this.isProcessingTick = false;
        }
    }

    private async performDailyTasks(forDate: Date): Promise<void> {
        console.log(`\n--- Starting Daily Tasks for: ${forDate.toISOString().split("T")[0]} ---`);

        try {
            const response = await reactivateVehicle();
            console.log(`---${response.message}---`);
            console.log(`${response.success && response.data}`);

            const dropOffDetails = await this.planAndDispatchShipments(forDate.toISOString().split("T")[0]);

            await new Promise((resolve) => setTimeout(resolve, SimulatedClock.SIMULATED_DAY_IN_REAL_MS * (2 / 3)));

            await this.notifyCompletedDeliveries(dropOffDetails);
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

    private extracOperationalCost(cost: string) {
        let extractedCost = 0;

        if (cost.includes("/")) {
            extractedCost += Number(cost.split("/")[0]);
        } else {
            extractedCost += Number(cost);
        }

        return extractedCost;
    }
    public async handleTruckDelivery(truckDelivery: TruckDelivery): Promise<void> {
        console.log("---------- TRUCKS BEING DELIVERED -----------")
        if (truckDelivery && truckDelivery.canFulfill) {
            for (let i = 0; i < truckDelivery.quantity; i++) {
                try {
                    await addVehicle({
                        type: truckDelivery.itemName,
                        purchase_date: simulatedClock.getCurrentDate().toISOString().split("T")[0],
                        operational_cost: this.extracOperationalCost(truckDelivery.operatingCostPerDay),
                        load_capacity: truckDelivery.maximumLoad,
                    });
                } catch (error) {
                    throw new Error("There was an error adding the vehicle");
                }
            }

            console.log("----------Delivered Trucks:");
            console.log(truckDelivery.itemName + " : " + truckDelivery.quantity);
        } else {
            console.error("Truck delivery cannot be fulfilled:", truckDelivery.message);
        }
    }

    // ========================================================================
    // PRIVATE HELPER METHODS (The "Cron Job" Logic)
    // ========================================================================

    /**
     * Ensures a bank account exists for the logistics company.
     * Creates one if it doesn't exist and updates company details.
     */
    private async ensureBankAccountExists(): Promise<void> {
        if (this.bankAccountSecured) {
            return;
        }

        console.log("Checking bank account status...");

        try {
            const bankAccount = await bankApiClient.getAccountDetails();
            let accountNumber: string;

            if (!bankAccount.success || !bankAccount.account_number) {
                console.log("No bank account found. Creating new account...");
                const accountCreationResponse = await bankApiClient.createAccount(BANK_NOTIFICATION_URL);
                accountNumber = accountCreationResponse.account_number;
                console.log(`Bank account created: ${accountNumber}`);
            } else {
                accountNumber = bankAccount.account_number;
                console.log(`Bank account already exists: ${accountNumber}`);
            }

            // Update company details in DB
            await updateCompanyDetails(COMPANY_NAME, {
                bankAccountNumber: accountNumber,
            });
            this.bankAccountSecured = true;
            console.log("Bank account details updated successfully.");
        } catch (error) {
            console.error(`Failed to secure bank account (will retry on next tick): ${error}`);
            // Don't set bankAccountSecured to true - will retry on next tick
            // Don't throw - allow other initialization steps to proceed
        }
    }

    /**
     * Fetches truck information from THOH and creates a price lookup map.
     * @returns Object mapping truck names to their prices
     */
    private async getTruckPriceMap(): Promise<{ [key: string]: number }> {
        const trucksInfo = await thohApiClient.getTrucksInformation();
        console.log("Fetched truck pricing information from THOH:", trucksInfo);

        // Validate response is an array
        if (!Array.isArray(trucksInfo)) {
            console.error("THOH getTrucksInformation returned non-array:", trucksInfo);
            throw new Error("Invalid response from THOH trucks API - expected array");
        }

        const priceMap: { [key: string]: number } = {};
        trucksInfo.forEach((truck) => {
            priceMap[truck.truckName] = truck.price;
        });

        return priceMap;
    }

    /**
     * Ensures a loan is secured to finance initial truck purchases.
     * @param truckPriceMap Price lookup for calculating loan amount
     */
    private async ensureLoanSecured(truckPriceMap: { [key: string]: number }): Promise<void> {
        // Check if loan already exists
        const allLoansInfo = await bankApiClient.getAllLoanDetails();

        if (allLoansInfo.success && allLoansInfo.loans.length > 0) {
            this.hasActiveLoan = true;
            console.log("Existing loan found. Skipping loan application.");
            return;
        }

        if (this.hasActiveLoan) {
            return;
        }

        console.log("No active loan found. Calculating required loan amount...");

        // Calculate total cost of required trucks
        const totalTruckCost = REQUIRED_INITIAL_TRUCKS.reduce((total, truckInfo) => {
            const price = truckPriceMap[truckInfo.truckName];
            return total + (price * truckInfo.quantity);
        }, 0);

        const totalLoanAmount = totalTruckCost * LOAN_MULTIPLIER;
        console.log(`Total truck cost: ${totalTruckCost}, Requesting loan: ${totalLoanAmount}`);

        const isLoanApplicationSuccessful = await this.checkAndSecureLoan(totalLoanAmount);

        if (isLoanApplicationSuccessful) {
            const accountBalance = await bankApiClient.getAccountDetails();
            this.funds = accountBalance.net_balance;
            console.log(`Loan secured successfully. Available funds: ${this.funds}`);
        } else {
            throw new Error("Failed to secure loan for truck purchases");
        }
    }

    /**
     * Processes payments for purchased trucks and adds them to the database.
     * @param truckPurchaseResponses Array of truck purchase responses
     */
    private async processTruckPayments(truckPurchaseResponses: (TruckPurchaseResponse | undefined)[]): Promise<void> {
        const firstResponse = truckPurchaseResponses[0];

        if (!firstResponse || !firstResponse.orderId) {
            console.log("First truck purchase response was undefined or missing orderId. Skipping payment.");
            return;
        }

        // Update THOH's bank account details
        await updateCompanyDetails(THOH_COMPANY_NAME, {
            bankAccountNumber: firstResponse.bankAccount,
        });
        console.log(`Updated ${THOH_COMPANY_NAME} bank account details`);

        // Calculate total cost of all truck purchases
        let totalCost = 0;
        for (const purchaseResponse of truckPurchaseResponses) {
            if (!purchaseResponse) continue;
            totalCost += purchaseResponse.totalPrice * purchaseResponse.quantity;
        }

        // Check if we have sufficient funds
        const accountDetails = await bankApiClient.getAccountDetails();
        if (accountDetails.success && accountDetails.net_balance !== undefined && accountDetails.net_balance < totalCost) {
            console.warn(`Insufficient funds for truck purchase. Need: ${totalCost}, Have: ${accountDetails.net_balance}`);
            console.log("Attempting to secure additional loan...");

            const loanAmount = totalCost * LOAN_MULTIPLIER;
            const loanSecured = await this.checkAndSecureLoan(loanAmount);

            if (!loanSecured) {
                console.error("Failed to secure loan for truck purchase. Will retry on next tick.");
                return;
            }
            console.log("Additional loan secured successfully.");
        }

        // Create payment promises for all truck purchases
        const paymentPromises: Promise<TransactionResponse>[] = [];

        for (const purchaseResponse of truckPurchaseResponses) {
            if (!purchaseResponse) continue;

            paymentPromises.push(
                bankApiClient.makePayment({
                    paymentDetails: {
                        to_account_number: purchaseResponse.bankAccount,
                        amount: purchaseResponse.totalPrice * purchaseResponse.quantity,
                        description: `${purchaseResponse.truckName} - purchase:${purchaseResponse.orderId}`,
                    },
                    transactionCategory: TransactionCategory.Purchase,
                })
            );
        }

        // Process all payments
        const paymentResults = await Promise.all(paymentPromises);

        let allPaymentsSuccessful = true;
        let paymentIndex = 0;

        for (const purchaseResponse of truckPurchaseResponses) {
            if (!purchaseResponse) continue;

            const paymentResult = paymentResults[paymentIndex];
            if (paymentResult.success) {
                console.log(`Payment successful for transaction: ${paymentResult.transaction_number}`);

                // Add trucks to database immediately after successful payment
                for (let i = 0; i < purchaseResponse.quantity; i++) {
                    try {
                        await addVehicle({
                            type: purchaseResponse.truckName,
                            purchase_date: simulatedClock.getCurrentDate().toISOString().split("T")[0],
                            operational_cost: this.extracOperationalCost(purchaseResponse.operatingCostPerDay),
                            load_capacity: purchaseResponse.maximumLoad,
                        });
                        console.log(`Added ${purchaseResponse.truckName} to database (${i + 1}/${purchaseResponse.quantity})`);
                    } catch (error) {
                        console.error(`Failed to add ${purchaseResponse.truckName} to database:`, error);
                        allPaymentsSuccessful = false;
                    }
                }
            } else {
                console.error("Payment failed:", paymentResult);
                allPaymentsSuccessful = false;
            }
            paymentIndex++;
        }

        if (allPaymentsSuccessful) {
            this.initialTrucksSecured = true;
            console.log("All truck payments processed successfully and trucks added to database.");
        } else {
            console.warn("Some trucks failed to be paid for or added to database. Will retry on next tick.");
        }
    }

    /**
     * Ensures the initial fleet of trucks is purchased and paid for.
     * Verifies we have the required number of each truck type.
     */
    private async ensureInitialFleetPurchased(): Promise<void> {
        if (this.initialTrucksSecured) {
            return;
        }

        console.log("Checking initial truck fleet status...");

        // Check if we already have the required vehicles
        const currentVehicles = await getAllVehiclesWithType();

        // Count vehicles by type
        const vehicleCounts: { [key: string]: number } = {};
        currentVehicles.forEach((vehicle) => {
            const typeName = vehicle.vehicle_type?.name ?? "";
            vehicleCounts[typeName] = (vehicleCounts[typeName] || 0) + 1;
        });

        // Check if we have all required trucks
        const missingTrucks: TruckPurchaseRequest[] = [];
        for (const requiredTruck of REQUIRED_INITIAL_TRUCKS) {
            const currentCount = vehicleCounts[requiredTruck.truckName] || 0;
            if (currentCount < requiredTruck.quantity) {
                const needed = requiredTruck.quantity - currentCount;
                missingTrucks.push({
                    truckName: requiredTruck.truckName,
                    quantity: needed,
                });
                console.log(`Need ${needed} more ${requiredTruck.truckName}(s). Currently have: ${currentCount}/${requiredTruck.quantity}`);
            }
        }

        if (missingTrucks.length === 0) {
            this.initialTrucksSecured = true;
            console.log(`Initial fleet complete. Total vehicles: ${currentVehicles.length}`);
            return;
        }

        console.log(`Missing trucks detected. Purchasing ${missingTrucks.length} truck type(s)...`);

        // Purchase only the missing trucks
        const purchasePromises = missingTrucks.map((truckInfo) =>
            this.checkAndPurchaseTrucks(truckInfo)
        );

        const purchaseResponses = await Promise.all(purchasePromises);

        console.log(`Successfully ordered ${purchaseResponses.filter(r => r !== undefined).length} truck type(s)`);

        // Process payments for all purchases
        await this.processTruckPayments(purchaseResponses);
    }

    /**
     * Orchestrates all one-time initialization operations.
     * Runs on the first simulation tick to set up bank account, loan, and initial fleet.
     */
    private async onInitOperations(): Promise<void> {
        console.log("\n=== INITIALIZATION OPERATIONS ===");
        console.log(this.hasActiveLoan, this.initialTrucksSecured, this.bankAccountSecured);

        // Step 1: Ensure bank account exists
        await this.ensureBankAccountExists();

        const currentVehicles =await getAllVehiclesWithType();

            if (currentVehicles.length > 3) {
              this.hasActiveLoan = true;
              this.initialTrucksSecured = true;
              this.bankAccountSecured = true;

              return;
            }

        const truckPriceMap = await this.getTruckPriceMap();

        // // Step 2: Get truck pricing information (needed for loan calculation)
        // let truckPriceMap: { [key: string]: number } = {};
        // try {
        //     truckPriceMap = await this.getTruckPriceMap();
        // } catch (error) {
        //     console.error("Failed to get truck pricing from THOH (will retry on next tick):", error);
        //     return; // Can't proceed without truck prices
        // }

        // Step 3: Ensure loan is secured for truck purchases
        await this.ensureLoanSecured(truckPriceMap);

        // Step 4: Purchase initial fleet of trucks
        await this.ensureInitialFleetPurchased();

        if (this.initialTrucksSecured && this.hasActiveLoan && this.bankAccountSecured) {
            console.log("=== INITIALIZATION COMPLETE ===\n");
        }
    }

    /**
     * Checks if a loan is needed and applies for one if conditions are met.
     */
    private async checkAndSecureLoan(amount: number): Promise<boolean> {
        try {
            const loanApplicationResponse = await bankApiClient.applyForLoan({ amount });

            this.hasActiveLoan = loanApplicationResponse.success;
            return this.hasActiveLoan;
        } catch (error) {
            console.error("Failed to secure a loan.", error);
        }
        return false;
    }

    /**
     * Checks if new trucks are needed and purchases them if conditions are met.
     */
    private async checkAndPurchaseTrucks(truckInfo: TruckPurchaseRequest): Promise<TruckPurchaseResponse | undefined> {
        try {
            const purchaseResult = await thohApiClient.purchaseTruck(truckInfo);
            return purchaseResult;
        } catch (error) {
            console.error("Failed to purchase trucks.", error);
        }
    }

    /**
     * Finds paid pickup requests and assigns vehicles to them.
     */
    private async planAndDispatchShipments(currentDate: string): Promise<LogisticsNotification[]> {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nMorning Ops: Planning and dispatching shipments...");
        const planner = new ShipmentPlannerService();
        let dropoffEntities: LogisticsNotification[] = [];
        const { createdShipmentsPlan } = await planner.planDailyShipments();
        // const vehiclesWithShipments = await findAllVehiclesWithShipments(currentDate);

        // const operationalCosts = vehiclesWithShipments.reduce((totalOperationalCost, vehicle) => {
        //     return totalOperationalCost + vehicle.operationalCost;
        // }, 0);

        // console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nOperational Costs for ${currentDate}...`);
        // console.log(operationalCosts);

        // const thohDetails = await getCompanyByName("thoh");

        // if (thohDetails && thohDetails.bankAccountNumber) {
        //     await bankApiClient.makePayment({
        //         paymentDetails: {
        //             to_account_number: thohDetails.bankAccountNumber,
        //             amount: operationalCosts,
        //             description: "bulk logistics operational Costs",
        //         },
        //         transactionCategory: TransactionCategory.Expense,
        //     });
        // } else {
        //     console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~\nOperational Costs for ${currentDate} can not be paid, THOH banking details missing `);
        // }

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
                                itemID: item.pickup_request_item_id,
                                name: item.itemName,
                                quantity: item.quantity,
                            },
                        ],
                    };
                    const response = await notificationApiClient.sendLogisticsNotification(pickupRequestNotification);
                    if (response.status >= 200 && response.status < 300) {
                        // Create shipment and assign this item to it
                        await shipmentModel.createShipmentAndAssignitems(Number(plan.vehicle.vehicle_id), item.pickup_request_item_id);
                        const machinesWithCount = [
                            "screen_machine",
                            "recyling_machine",
                            "ephone_machine",
                            "ephone_plus_machine",
                            "ephone_pro_max_machine",
                        ];
                        if (machinesWithCount.includes(item.itemName)) {
                            dropoffEntities.push({
                                id: item.pickup_request_id,
                                notificationURL: item.destinationCompanyUrl,
                                type: "DELIVERY",
                                quantity: 1,
                                items: [
                                    {
                                        itemID: item.pickup_request_item_id,
                                        name: item.itemName,
                                        quantity: 1,
                                    },
                                ],
                            });
                        } else {
                            dropoffEntities.push({
                                id: item.pickup_request_id,
                                notificationURL: item.destinationCompanyUrl,
                                type: "DELIVERY",
                                quantity: item.quantity,
                                items: [
                                    {
                                        itemID: item.pickup_request_item_id,
                                        name: item.itemName,
                                        quantity: item.quantity,
                                    },
                                ],
                            });
                        }
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
    private async notifyCompletedDeliveries(newNotifications: LogisticsNotification[]): Promise<void> {
        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV\nEvening Ops: Notifying completed deliveries...");
        const queuedNotifications = await getQueuedNotifications();
        const notificationsToProcess = queuedNotifications.map((qn) => qn.payload);

        const allNotificationsToAttempt = [...notificationsToProcess, ...newNotifications];
        let deliveredItemIDs: number[] = [];

        for (const notification of allNotificationsToAttempt) {
            try {
                const response = await notificationApiClient.sendLogisticsNotification(notification);

                if (response.status >= 200 && response.status < 300) {
                    console.log(`Successfully sent delivery notification for request ID: ${notification.id}`);
                    await removeSuccessfulNotification(+notification.id);

                    deliveredItemIDs = [...deliveredItemIDs, ...notification.items.map(item => item.itemID )];
                    console.log("Items delivered: ", deliveredItemIDs)
                } else {
                    throw new Error(`Received HTTP ${response.status} from notification endpoint.`);
                }
            } catch (error) {
                console.error(`Failed to send delivery notification for request ID: ${notification.id}. Adding to retry queue.`, error);
                await addOrUpdateFailedNotification(notification, simulatedClock.getCurrentDate());
            }
        }

        try {

            const statusId = await shipmentStatus.findShipmentStatusByName(ShipmentStatus.Delivered);
            
            if (!statusId) {
                throw new Error(`Configuration Error: ShipmentStatus '${ShipmentStatus.Delivered}' not found in database.`);
            }
            
            console.log("Items to ship: ", deliveredItemIDs)
            await shipmentProcessingService.processShipmentUpdate({
                itemsIDs: deliveredItemIDs, 
                newStatusId: statusId
            });
            
            await updatePickupRequestStatuses(simulatedClock.getCurrentDate());

            deliveredItemIDs = [];
        } catch (err: any) {
            console.error("Failed to process shipment update:", err.message);
        }

        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    }
}

export const autonomyService = AutonomyService.getInstance();
