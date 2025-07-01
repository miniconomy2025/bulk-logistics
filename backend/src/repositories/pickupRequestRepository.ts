import database from "../config/database";
import {
  PickupRequestEntity,
  PickupRequestRequest,
} from "../models/PickupRequest";

export const savePickupRequest = async (pickupRequest: PickupRequestEntity) => {
  await database.query(
    "CALL create_pickup_request($1, $2, $3, $4, $5, $6, $7::jsonb)",
    [
      pickupRequest.requestingCompanyId,
      pickupRequest.originCompanyId,
      pickupRequest.destinationCompanyId,
      pickupRequest.originalExternalOrderId,
      pickupRequest.cost,
      pickupRequest.requestDate,
      pickupRequest.items,
    ],
  );
};

// export interface PickupRequestEntity {
//     requestingCompanyId: string;
//     originCompanyId: string;
//     destinationCompanyId: string;
//     originalExternalOrderId: string;
//     cost: number;
//     requestDate: Date;
//     completionDate?: Date;
//     items: [ItemRequest];
// }
