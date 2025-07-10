import { VehicleType } from "../enums";
import { getAllLoans } from "../models/transactionsRepository";
import { PickupRequestRequest } from "../types/PickupRequest";
import { getVehicleForPickupRequest } from "./vehicleService";

const PROFIT_MARGIN = 0.5;

export const calculateDeliveryCost = async (pickupRequestDetails: PickupRequestRequest): Promise<number> => {
    try {
        const vehicleResult = await getVehicleForPickupRequest(pickupRequestDetails);

        if (!vehicleResult.success || !vehicleResult.vehicles) {
            return 0;
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
    } catch {
        return 150;
    }
};
