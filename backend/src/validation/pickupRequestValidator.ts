import { getCompanyByName } from "../models/companyRepository";
import { PickupRequestRequest } from "../types/PickupRequest";

export const validatePickupRequest = async (pickupRequest: PickupRequestRequest) => {
    const destinationCompanyResult = await getCompanyByName(pickupRequest.destinationCompany);
    const originCompanyResult = await getCompanyByName(pickupRequest.originCompany);

    if (!destinationCompanyResult || !originCompanyResult) {
        throw new Error("Either the destination or the origin company is invalid.");
    }

    //todo: refactor
    const items = pickupRequest.items;
    items.forEach((item: ItemRequest) => {
        const { itemName, quantity, measurementType } = item;
        if (
            [
                "copper",
                "silicon",
                "sand",
                "plastic",
                "aluminium",
                "electronics_machine",
                "ephone_machine",
                "ephone_plus_machine",
                "ephone_pro_max_machine",
                "cosmos_z25_machine",
                "cosmos_z25_ultra_machine",
                "cosmos_z25_fe_machine",
                "case_machine",
                "screen_machine",
                "recycling_machine",
            ].includes(itemName)
        ) {
            if (quantity > 5000) {
                throw new Error(
                    `You have attempted to purchase too much ${itemName} in one go. The max quantity is 5000kg and you have ordered ${quantity}kg for a single item in a single pickup request.`,
                );
            }
        } else if (["electronics", "screens", "cases"].includes(itemName)) {
            if (quantity > 2000) {
                throw new Error(
                    `You have attempted to purchase too many ${itemName} in one go. The max quantity is 2000 units and you have ordered ${quantity} units for a single item in a single pickup request.`,
                );
            }
        } else {
            throw new Error(
                `You have tried to order an item which we do not support (${itemName}). The list of valid items is: "copper", "silicon", "sand", "plastic", "aluminium","electronics_machine","ephone_machine","ephone_plus_machine","ephone_pro_max_machine","cosmos_z25_machine","cosmos_z25_ultra_machine","cosmos_z25_fe_machine","case_machine","screen_machine","recycling_machine","electronics","screens", and "cases"`,
            );
        }
    });

    return;
};
