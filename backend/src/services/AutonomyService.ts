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
import { TransactionCategory } from "../enums";
import { reactivateVehicle } from "./vehicleService";
import { getCompanyByName, updateCompanyDetails } from "../models/companyRepository";
import { SimulatedClock, simulatedClock } from "../utils";
import { addOrUpdateFailedNotification, getQueuedNotifications, removeSuccessfulNotification } from "../models/notificationsQueueRepository";
import { getItemDefinitions } from "../models/pickupRequestItemRepository";

const TICK_CHECK_INTERVAL_MS = 15000;

// Configuration constants
const REQUIRED_INITIAL_TRUCKS: TruckPurchaseRequest[] = [
    { truckName: "large_truck", quantity: 4 },
    { truckName: "medium_truck", quantity: 4 },
];
const BANK_NOTIFICATION_URL = "https://bulk-logistics-api.projects.bbdgrad.com/api/bank";
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

                // If this is the very first tick, run the one-time setup.
                if (this.lastProcessedSimDate == null || !this.initialTrucksSecured || !this.hasActiveLoan || !this.bankAccountSecured) {
                    await this.onInitOperations();
                }

                // Run all tasks for this new day
                await this.performDailyTasks(trueSimulatedDate);

                this.lastProcessedSimDate = todayStr;

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

        try {
            await updateCompanyDetails(COMPANY_NAME, {
                bankAccountNumber: accountNumber,
            });
            this.bankAccountSecured = true;
            console.log("Bank account details updated successfully.");
        } catch (error) {
            throw new Error(`Failed to update bank account details for ${COMPANY_NAME}: ${error}`);
        }
    }

    /**
     * Fetches truck information from THOH and creates a price lookup map.
     * @returns Object mapping truck names to their prices
     */
    private async getTruckPriceMap(): Promise<{ [key: string]: number }> {
        const trucksInfo = await thohApiClient.getTrucksInformation();
        console.log("Fetched truck pricing information from THOH");

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
     * Processes payments for purchased trucks.
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
        paymentResults.forEach((result) => {
            if (result.success) {
                console.log(`Payment successful for transaction: ${result.transaction_number}`);
            } else {
                console.error("Payment failed:", result);
                allPaymentsSuccessful = false;
            }
        });

        if (allPaymentsSuccessful) {
            this.initialTrucksSecured = true;
            console.log("All truck payments processed successfully.");
        }
    }

    /**
     * Ensures the initial fleet of trucks is purchased and paid for.
     * @param truckPriceMap Price lookup for validation (optional, for future use)
     */
    private async ensureInitialFleetPurchased(): Promise<void> {
        if (this.initialTrucksSecured) {
            return;
        }

        console.log("Checking initial truck fleet status...");

        // Check if we already have vehicles
        const currentVehicles = await getAllVehiclesWithType();

        if (currentVehicles.length > 0) {
            this.initialTrucksSecured = true;
            console.log(`Initial fleet already exists (${currentVehicles.length} vehicles found).`);
            return;
        }

        console.log("No vehicles found. Purchasing initial truck fleet...");

        // Purchase all required trucks
        const purchasePromises = REQUIRED_INITIAL_TRUCKS.map((truckInfo) =>
            this.checkAndPurchaseTrucks(truckInfo)
        );

        const purchaseResponses = await Promise.all(purchasePromises);

        console.log(`Successfully ordered ${purchaseResponses.length} truck types`);

        // Process payments for all purchases
        await this.processTruckPayments(purchaseResponses);
    }

    /**
     * Orchestrates all one-time initialization operations.
     * Runs on the first simulation tick to set up bank account, loan, and initial fleet.
     */
    private async onInitOperations(): Promise<void> {
        console.log("\n=== INITIALIZATION OPERATIONS ===");

        try {
            // Step 1: Ensure bank account exists
            await this.ensureBankAccountExists();

            // Step 2: Get truck pricing information
            const truckPriceMap = await this.getTruckPriceMap();

            // Step 3: Ensure loan is secured for truck purchases
            await this.ensureLoanSecured(truckPriceMap);

            // Step 4: Purchase initial fleet of trucks
            await this.ensureInitialFleetPurchased();

            console.log("=== INITIALIZATION COMPLETE ===\n");
        } catch (error) {
            console.error("FATAL ERROR during initialization operations:", error);
            throw error;
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
        const { createdShipmentsPlan, plannedRequestIds } = await planner.planDailyShipments();
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
                                name: item.itemName,
                                quantity: item.quantity,
                            },
                        ],
                    };
                    const response = await notificationApiClient.sendLogisticsNotification(pickupRequestNotification);
                    if (response.status >= 200 && response.status < 300) {
                        await shipmentModel.createShipmentAndAssignitems(plan.vehicle.vehicle_id, item.pickup_request_item_id, plannedRequestIds);
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

        for (const notification of allNotificationsToAttempt) {
            try {
                const response = await notificationApiClient.sendLogisticsNotification(notification);

                if (response.status >= 200 && response.status < 300) {
                    console.log(`Successfully sent delivery notification for request ID: ${notification.id}`);
                    await removeSuccessfulNotification(+notification.id);
                } else {
                    throw new Error(`Received HTTP ${response.status} from notification endpoint.`);
                }
            } catch (error) {
                console.error(`Failed to send delivery notification for request ID: ${notification.id}. Adding to retry queue.`, error);
                await addOrUpdateFailedNotification(notification, simulatedClock.getCurrentDate());
            }
        }

        await updatePickupRequestStatuses(simulatedClock.getCurrentDate());

        console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    }
}

export const autonomyService = AutonomyService.getInstance();
