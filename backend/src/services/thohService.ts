/*
================================================================================
| FILE: /src/services/thohService.ts (CORRECTED)
| DESC: This file has been corrected to call the proper method names on the
|       autonomyService singleton instance.
================================================================================
*/
import db from "../config/database";
import { ThohEvents } from "../enums";
import { getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicle";
import { ThohEvent, TruckFailureInfo } from "../types/thoh";
import { SimulatedClock } from "../utils";
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
        case ThohEvents.TruckDelivery:
            autonomyService.handleTruckDelivery(thohEvent.data);
            break;
        default:
            console.log("ERROR: UNACCOUNTED FOR MESSAGE TYPE FROM THOH:", thohEvent);
            throw new AppError("Thoh Event type has not been accounted for. Please contact bulk-logistics.", 422);
    }
};

export const handleTruckFailure = async (failureInfo: TruckFailureInfo) => {

  const allVehicles = await getAllVehiclesWithType();

  if (!allVehicles.length || !failureInfo.failureQuantity) {
    return {
      success: false,
      message: 'No vehicles to fail',
    }
  }

  const vehiclesToFail = [];

  for (const vehicle of allVehicles) {

    if (vehicle.vehicle_type.name === failureInfo.truckName) {
      vehiclesToFail.push(vehicle);
    }

    if (vehiclesToFail.length === failureInfo.failureQuantity) {
      break;
    }
  }

  const disableVehicles = [];

  for (const vehicle of vehiclesToFail) {

    const response = await updateVehicleStatus(vehicle.vehicle_id, false, SimulatedClock.getSimulatedTime().toISOString());

    disableVehicles.push(response);
    console.log('----Vehicle Disabled-----');
    console.log({response});
  }

  return {
      success: true,
      message: 'Successfully Disabled Trucks',
      data: disableVehicles,
  }
};
