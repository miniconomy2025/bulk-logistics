/*
================================================================================
| FILE: /src/services/thohService.ts (CORRECTED)
| DESC: This file has been corrected to call the proper method names on the
|       autonomyService singleton instance.
================================================================================
*/
import { ThohEvents } from "../enums";
import { ThohEvent } from "../types/thoh";
import AppError from "../utils/errorHandlingMiddleware/appError";
import AutonomyService, { autonomyService } from "./AutonomyService";

export const processThohEvent = (thohEvent: ThohEvent) => {
    switch (thohEvent.type) {
        case ThohEvents.StartSimulation:
            autonomyService.start(thohEvent.data);
            break;
        case ThohEvents.EndSimulation:
            autonomyService.stop();
            break;
        case ThohEvents.ResetSimulation:
            autonomyService.reset(thohEvent.data);
            break;
        case ThohEvents.VehicleCrash:
            autonomyService.handleVehicleCrash(/*will likely need data here soon */); 
            break;
        default:
            console.log("ERROR: UNACCOUNTED FOR MESSAGE TYPE FROM THOH:", thohEvent);
            throw (new AppError("Thoh Event type has not been accounted for. Please contact bulk-logistics.", 422));
    }
};