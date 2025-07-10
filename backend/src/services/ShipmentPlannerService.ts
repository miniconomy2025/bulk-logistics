import { findPaidAndUnshippedRequests } from "../models/pickupRequestRepository";
import { findAvailableVehicles } from "../models/vehicle"; // Assuming this returns VehicleWithType[]
import { shipmentModel } from "../models/shipment";

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
        console.log("all pending requests",allPendingRequests)
        allPendingRequests.forEach(request => console.log(request.items));
        console.log("sim clock date",simulatedClock.getCurrentDate());
        const vehicleData = await findAvailableVehicles(simulatedClock.getCurrentDate().toISOString());
        console.log("vehicleData",vehicleData)

        const availableFleet: PlannableVehicle[] = vehicleData.map((v) => ({
            ...v,
            capacityRemaining: v.maximum_capacity,
            pickupsAssignedToday: 0,
            capacity_type_id: v.capacity_type_id,
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
            const tempFleetState: PlannableVehicle[] = JSON.parse(JSON.stringify(fleet));
            const dryRunPlan = new Map<number, { items: PickupToShipmentItemDetails[] }>();
            let canFitEntireRequest = true;

            for (const item of request.items) {
                if (item.shipment_id) {
                    continue;
                }
                const vehicleIndex = this._findVehicleForItem(item, tempFleetState);
                if (vehicleIndex === -1) {
                    canFitEntireRequest = false;
                    break;
                }
                tempFleetState[vehicleIndex].capacityRemaining -= item.quantity;
                if (!dryRunPlan.has(tempFleetState[vehicleIndex].vehicle_id)) {
                    dryRunPlan.set(tempFleetState[vehicleIndex].vehicle_id, { items: [] });
                }
                dryRunPlan.get(tempFleetState[vehicleIndex].vehicle_id)!.items.push(item);
            }
            if (canFitEntireRequest) {
                console.log(`PASS 1: Planning full request ${request.pickupRequestId}`);
                this._commitDryRun(dryRunPlan, fleet, plans);
                plannedIds.add(request.pickupRequestId);
            }
        }
    }

    /**
     * PASS 2: Iterates through remaining items and fits them into any available capacity.
     */
    private _planPartialRequests(requests: PickupRequestWithDetails[], fleet: PlannableVehicle[], plans: Map<number, ShipmentPlan>): void {
        const allRemainingItems = requests.flatMap((req) => req.items.map((item) => ({ ...item, pickupRequestId: req.pickupRequestId })));

        for (const item of allRemainingItems) {
            const vehicleIndex = this._findVehicleForItem(item, fleet);
            if (item.shipment_id) {
                continue;
            }

            if (vehicleIndex !== -1) {
                console.log(`PASS 2: Planning partial item ${item.itemName} from request ${item.pickupRequestId}`);
                const vehicle = fleet[vehicleIndex];

                if (!plans.has(vehicle.vehicle_id)) {
                    plans.set(vehicle.vehicle_id, {
                        vehicle,
                        itemsToAssign: [],
                        originCompanyName: "ORIGIN FILLER",
                        destinationCompanyName: "DESTINATION FILLER",
                    });
                }
                plans.get(vehicle.vehicle_id)!.itemsToAssign.push(item);

                vehicle.capacityRemaining -= item.quantity;
            }
        }
    }

    /**
     * Finds the first available vehicle that can accommodate a given item.
     */
    private _findVehicleForItem(item: PickupToShipmentItemDetails, fleet: PlannableVehicle[]): number {
        return fleet.findIndex(
            (vehicle) =>
                vehicle.capacity_type_id === item.capacity_type_id &&
                vehicle.capacityRemaining >= item.quantity &&
                vehicle.pickupsAssignedToday < vehicle.max_pickups_per_day,
        );
    }

    /**
     * Helper to merge a successful dry run plan into the main plan.
     */
    private _commitDryRun(
        dryRunPlan: Map<number, { items: PickupToShipmentItemDetails[] }>,
        fleet: PlannableVehicle[],
        plans: Map<number, ShipmentPlan>,
    ): void {
        for (const [vehicleId, plan] of dryRunPlan.entries()) {
            const vehicle = fleet.find((v) => v.vehicle_id === vehicleId)!;
            vehicle.capacityRemaining -= plan.items.reduce((sum, item) => sum + item.quantity, 0);

            if (!plans.has(vehicleId)) {
                plans.set(vehicleId, {
                    vehicle,
                    itemsToAssign: [],
                    originCompanyName: "ORIGIN FILLER",
                    destinationCompanyName: "DESTINATION FILLER",
                });
            }
            plans.get(vehicleId)!.itemsToAssign.push(...plan.items);
        }
    }
}
