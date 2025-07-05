import { Request, Response } from "express";
import { validatePickupRequest } from "../validation/pickupRequestValidator";
import { PickupRequestRequest } from "../models/PickupRequest";
import { calculateDeliveryCost } from "../services/DeliveryCostCalculatorService";

export const createPickupRequest = async (req: Request, res: Response) => {
    try {
        const pickupRequestDetails: PickupRequestRequest = req.body;
        // Step 1: Validate. validatePickupRequest will throw an error, if we reach this point we are safe.
        validatePickupRequest(pickupRequestDetails);
        // Step 2: We need to work out how much the pickup will be.
        const cost = await calculateDeliveryCost(pickupRequestDetails);
        // Step 3: We create the pickup request in the DB with all pending states.

        // Step 4: We send a response with the finalisation of the order details.

        // Step 5: We emit a "pickup request created" event via an observable.
    } catch (error) {}
};
