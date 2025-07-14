import { findPaidAndUnshippedRequests } from "../models/pickupRequestRepository";
import { findAvailableVehicles } from "../models/vehicleRepository";

// Importing the specific types you provided
import { PickupRequestWithDetails, PickupToShipmentItemDetails } from "../types";
import { VehicleWithType } from "../types";
import { DailyPlanOutput, PlannableVehicle, ShipmentPlan } from "../types/shipmentPlanning";
import { simulatedClock } from "../utils";

export class ShipmentPlannerService {
    /**
     * The main entry point for the daily shipment planning process.
     * @param simulatedDate The current date of the simulation.
     */
    public async planDailyShipments(): Promise<DailyPlanOutput> {
        console.log(`--- Starting Shipment Planning for ${simulatedClock.getCurrentDate()} ---`);

        const allPendingRequests = await findPaidAndUnshippedRequests();
        // console.log("all pending requests", allPendingRequests);
        allPendingRequests.forEach((request) => console.log(request.items));
        // console.log("sim clock date", simulatedClock.getCurrentDate());
        const vehicleData = await findAvailableVehicles(simulatedClock.getCurrentDate().toISOString());
        // console.log("vehicleData", vehicleData);

        const availableFleet: PlannableVehicle[] = vehicleData.map((v) => ({
            ...v,
            capacityRemaining: v.maximum_capacity,
            pickupsAssignedToday: 0,
            dropoffsAssignedToday: 0,
            capacity_type_id: v.capacity_type_id,
            assignedOrigins: new Set<string>(),
            assignedDestinations: new Set<string>(),
        }));

        const plannedRequestIds = new Set<number>();
        const finalShipmentPlans = new Map<number, ShipmentPlan>(); // Key: vehicle_id

        this._planFullRequests(allPendingRequests, availableFleet, plannedRequestIds, finalShipmentPlans);
        const remainingRequests = allPendingRequests.filter((req) => !plannedRequestIds.has(req.pickupRequestId));
        this._planPartialRequests(remainingRequests, availableFleet, finalShipmentPlans);

        console.log(`--- Finished Shipment Planning. ${finalShipmentPlans.size} shipments planned.`);
        return {
            createdShipmentsPlan: Array.from(finalShipmentPlans.values()),
            plannedRequestIds: Array.from(plannedRequestIds),
        };
    }

    /**
     * PASS 1: Iterates through requests and attempts to assign them if they fit entirely.
     */
    private _planFullRequests(
        requests: PickupRequestWithDetails[],
        fleet: PlannableVehicle[],
        plannedIds: Set<number>,
        plans: Map<number, ShipmentPlan>,
    ): void {
        for (const request of requests) {
            const tempFleetState: PlannableVehicle[] = fleet.map((v) => ({
                ...v,
                assignedOrigins: new Set(v.assignedOrigins),
                assignedDestinations: new Set(v.assignedDestinations),
            }));
            const dryRunPlan = new Map<number, { items: PickupToShipmentItemDetails[] }>();
            let canFitEntireRequest = true;

            for (const item of request.items) {
                if (item.shipment_id) {
                    continue;
                }
                const vehicleIndex = this.findVehicleForItem(item, tempFleetState, request.originCompanyName, request.destinationCompanyName);

                if (vehicleIndex === -1) {
                    canFitEntireRequest = false;
                    break;
                }

                const tempVehicle = tempFleetState[vehicleIndex];
                tempVehicle.capacityRemaining -= item.quantity;
                if (!tempVehicle.assignedOrigins.has(request.originCompanyName)) {
                    tempVehicle.assignedOrigins.add(request.originCompanyName);
                    tempVehicle.pickupsAssignedToday++;
                }
                if (!tempVehicle.assignedDestinations.has(request.destinationCompanyName)) {
                    tempVehicle.assignedDestinations.add(request.destinationCompanyName);
                    tempVehicle.dropoffsAssignedToday++;
                }

                if (!dryRunPlan.has(tempVehicle.vehicle_id)) {
                    dryRunPlan.set(tempVehicle.vehicle_id, { items: [] });
                }
                dryRunPlan.get(tempVehicle.vehicle_id)!.items.push(item);
            }
            if (canFitEntireRequest) {
                console.log(`PASS 1: Planning full request ${request.pickupRequestId}`);
                fleet = tempFleetState;
                this.commitPlan(request, dryRunPlan, plans, fleet);
                plannedIds.add(request.pickupRequestId);
            }
        }
    }

    /**
     * PASS 2: Iterates through remaining items and fits them into any available capacity.
     */
    private _planPartialRequests(requests: PickupRequestWithDetails[], fleet: PlannableVehicle[], plans: Map<number, ShipmentPlan>): void {
        const allRemainingItems = requests.flatMap((req) =>
            req.items.map((item) => ({
                ...item,
                originCompanyName: req.originCompanyName,
                destinationCompanyName: req.destinationCompanyName,
            })),
        );
        for (const item of allRemainingItems) {
            const vehicleIndex = this.findVehicleForItem(item, fleet, item.originCompanyName, item.destinationCompanyName);
            if (item.shipment_id) {
                continue;
            }
            if (vehicleIndex !== -1) {
                console.log(`PASS 2: Planning partial item ${item.itemName} from request ${item.pickup_request_id}`);
                const vehicle = fleet[vehicleIndex];

                vehicle.capacityRemaining -= item.quantity;
                if (!vehicle.assignedOrigins.has(item.originCompanyName)) {
                    vehicle.assignedOrigins.add(item.originCompanyName);
                    vehicle.pickupsAssignedToday++;
                }
                if (!vehicle.assignedDestinations.has(item.destinationCompanyName)) {
                    vehicle.assignedDestinations.add(item.destinationCompanyName);
                    vehicle.dropoffsAssignedToday++;
                }

                if (!plans.has(vehicle.vehicle_id)) {
                    plans.set(vehicle.vehicle_id, {
                        vehicle,
                        itemsToAssign: [],
                        originCompanyNames: new Set(),
                        destinationCompanyNames: new Set(),
                    });
                }
                const plan = plans.get(vehicle.vehicle_id)!;
                plan.itemsToAssign.push(item);
                plan.originCompanyNames.add(item.originCompanyName);
                plan.destinationCompanyNames.add(item.destinationCompanyName);
            }
        }
    }

    /**
     * Finds the first available vehicle that can accommodate a given item.
     */
    private findVehicleForItem(
        item: PickupToShipmentItemDetails,
        fleet: PlannableVehicle[],
        originCompanyName: string,
        destinationCompanyName: string,
    ): number {
        return fleet.findIndex((vehicle) => {
            const canTakeItem = vehicle.capacity_type_id === item.capacity_type_id && vehicle.capacityRemaining >= item.quantity;

            if (!canTakeItem) return false;

            // Check if adding this item's origin would exceed the pickup limit
            const isNewOrigin = !vehicle.assignedOrigins.has(originCompanyName);
            const hasPickupsLeft = vehicle.pickupsAssignedToday < vehicle.max_pickups_per_day;
            if (isNewOrigin && !hasPickupsLeft) {
                return false; // Can't go to a new origin if pickup slots are full
            }

            // Check if adding this item's destination would exceed the drop-off limit
            const isNewDestination = !vehicle.assignedDestinations.has(destinationCompanyName);
            // FIX: This now correctly compares against the vehicle's max_dropoffs_per_day limit
            const hasDropoffsLeft = vehicle.dropoffsAssignedToday < vehicle.max_pickups_per_day;
            if (isNewDestination && !hasDropoffsLeft) {
                return false; // Can't go to a new destination if drop-off slots are full
            }

            // If we've passed all checks, the vehicle is suitable
            return true;
        });
    }

    /**
     * Helper to merge a successful dry run plan into the main plan.
     */
    private commitPlan(
        request: PickupRequestWithDetails,
        dryRunPlan: Map<number, { items: PickupToShipmentItemDetails[] }>,
        plans: Map<number, ShipmentPlan>,
        fleet: PlannableVehicle[],
    ): void {
        for (const [vehicleId, plan] of dryRunPlan.entries()) {
            if (!plans.has(vehicleId)) {
                const vehicleForPlan = fleet.find((v) => v.vehicle_id === vehicleId)!;

                plans.set(vehicleId, {
                    vehicle: vehicleForPlan,
                    itemsToAssign: [],
                    originCompanyNames: new Set(),
                    destinationCompanyNames: new Set(),
                });
            }
            const mainPlan = plans.get(vehicleId)!;
            mainPlan.itemsToAssign.push(...plan.items);
            mainPlan.originCompanyNames.add(request.originCompanyName);
            mainPlan.destinationCompanyNames.add(request.destinationCompanyName);
        }
    }
}
