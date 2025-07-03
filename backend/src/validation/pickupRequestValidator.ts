import { PickupRequestRequest } from "../types/PickupRequest";

export const validatePickupRequest = (pickupRequest: PickupRequestRequest) => {
    // here we get the list of possible companies
    // and we check whether or not the identifiers provided are within the domain or not.

    // we also check that the number of items does not go above some hard max that we can set in the
    //future if need be.

    //Typescript will handle the nullability of the fields within the pickupRequest type.

    // Finally we check that the provided items are valid and within the DB.
    return;
};
