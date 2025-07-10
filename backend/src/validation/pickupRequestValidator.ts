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
    items.forEach((item) => {
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
                "screens",
                "cases",
                "electronics"
            ].includes(itemName)
        ) {
            return;
        } else {
            throw new Error(
                `You have tried to order an item which we do not support (${itemName}). The list of valid items is: "copper", "silicon", "sand", "plastic", "aluminium","electronics_machine","ephone_machine","ephone_plus_machine","ephone_pro_max_machine","cosmos_z25_machine","cosmos_z25_ultra_machine","cosmos_z25_fe_machine","case_machine","screen_machine","recycling_machine","electronics","screens", and "cases"`,
            );
        }
    });

    return;
};
