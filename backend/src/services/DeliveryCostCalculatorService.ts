import { VehicleType } from "../enums";
import { PickupRequestRequest } from "../types/pickupRequest";
import { getVehicleForPickupRequest } from "./vehicleService";

const PROFIT_MARGIN = 0.5;

export const calculateDeliveryCost = async (pickupRequestDetails: PickupRequestRequest): Promise<number> => {
    // Get the type of vehicle we will be using.
    const vehicleResult = await getVehicleForPickupRequest(pickupRequestDetails);

    if (!vehicleResult.success || !vehicleResult.vehicles) {
        return 0;
    }

    //TODO: get next loan repayment
    const loanRepayment = 500;

    let totalOperationalCost = 0;
    let loanRepaymentPerDelivery = 0;

    for (const vehicle of vehicleResult.vehicles) {
        const { daily_operational_cost, vehicle_type } = vehicle;

        switch (vehicle_type.name) {
            case VehicleType.Large:
                totalOperationalCost += daily_operational_cost;
                loanRepaymentPerDelivery += loanRepayment / 30;
                break;
            case VehicleType.Medium:
            case VehicleType.Small:
                totalOperationalCost += Number(daily_operational_cost) / vehicle_type.max_pickups_per_day;
                loanRepaymentPerDelivery += loanRepayment / 30 / vehicle_type.max_pickups_per_day;
                break;
            default:
                throw new Error("Unknown vehicle type.");
        }
    }

    const baseCost = totalOperationalCost + loanRepaymentPerDelivery;
    // Add profit margin
    const finalCost = baseCost * (1 + PROFIT_MARGIN);

    return Math.ceil(finalCost);
};
