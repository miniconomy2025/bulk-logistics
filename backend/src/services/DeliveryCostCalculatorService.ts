import { VehicleType } from "../enums";
import { getAllLoans } from "../models/transactionsRepository";
import { PickupRequestRequest } from "../types/PickupRequest";
import { getVehicleForPickupRequest } from "./vehicleService";

const PROFIT_MARGIN = 0.5;

export const calculateDeliveryCost = async (pickupRequestDetails: PickupRequestRequest): Promise<number> => {
    try {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~ Checking Vehicles ~~~~~~~~~~~~~~~~~~~~~~~");

        const vehicleResult = await getVehicleForPickupRequest(pickupRequestDetails);

        if (!vehicleResult.success || !vehicleResult.vehicles) {
            console.warn("No vehicles available for pickup request, returning fallback cost of 150");
            return 150;
        }

        const allLoans = await getAllLoans();

        let loanRepayment = 0;
        let averageInterest = 0;
        if (allLoans.length > 0) {
            let totalInterest = 0;
            let totalLoanAmount = 0;
            for (const loan of allLoans) {
                totalInterest += loan.interestRate;
                totalLoanAmount += loan.loanAmount;
            }

            averageInterest = totalInterest / allLoans.length;

            loanRepayment = (totalLoanAmount * averageInterest) / 365 + totalLoanAmount / 1825;
        }

        let totalOperationalCost = 0;
        let loanRepaymentPerDelivery = 0;

        for (const vehicle of vehicleResult.vehicles) {
            const { daily_operational_cost, vehicle_type } = vehicle;

            // Validate operational cost is not negative
            if (daily_operational_cost! < 0) {
                console.warn(`Negative operational cost detected for vehicle type ${vehicle_type?.name}, using absolute value`);
            }

            const operationalCost = Math.abs(Number(daily_operational_cost));

            switch (vehicle_type?.name) {
                case VehicleType.Large:
                    totalOperationalCost += operationalCost;
                    loanRepaymentPerDelivery += loanRepayment / 30;
                    break;
                case VehicleType.Medium:
                case VehicleType.Small:
                    // Prevent division by zero
                    if (vehicle_type.max_pickups_per_day === 0) {
                        console.warn(`Vehicle type ${vehicle_type.name} has max_pickups_per_day of 0, using full daily cost`);
                        totalOperationalCost += operationalCost;
                        loanRepaymentPerDelivery += loanRepayment / 30;
                    } else {
                        totalOperationalCost += operationalCost / vehicle_type.max_pickups_per_day;
                        loanRepaymentPerDelivery += loanRepayment / 30 / vehicle_type.max_pickups_per_day;
                    }
                    break;
                default:
                    throw new Error("Unknown vehicle type.");
            }
        }
        let baseCost  = totalOperationalCost + loanRepaymentPerDelivery;
        baseCost = baseCost === 0 ? baseCost = 1 : baseCost;
        // Add profit margin
        const finalCost = baseCost * (1 + PROFIT_MARGIN);

        return Math.ceil(finalCost);
    } catch (error) {
        console.error("Error calculating delivery cost:", error);
        console.warn("Returning fallback cost of 150 due to error");
        return 150;
    }
};
