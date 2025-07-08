import { PickupRequestRequest } from "../types/PickupRequest";

export const validatePickupRequest = (pickupRequest: PickupRequestRequest) => {

    // Check that the origin company id is in the DB
    //const companyCheck = await getCompany(pickupRequest.originCompanyId)
    //

    // Check that the items coming in are correct.
    const items = pickupRequest.items;
    items.forEach(item => {
        const { itemName, quantity, measurementType } = item;
        if (['Copper', 'Silicon', 'Sand', 'Plastic', 'Aluminium'].includes(itemName)) {
            if (quantity > 5000) {
                throw new Error(`You have attempted to purchase too much ${itemName} in one go. The max quantity is 5000kg and you have ordered ${quantity}kg for a single item in a single pickup request.`)
            }
        }
        else if (['Electronics', 'Screens', 'Cases'].includes(itemName)) {
            if (quantity > 2000) {
                throw new Error(`You have attempted to purchase too many ${itemName} in one go. The max quantity is 2000 units and you have ordered ${quantity} units for a single item in a single pickup request.`)
            }
        }
        else {
            throw new Error(`You have tried to order an item which we do not support (${itemName}). The list of valid items is: 'Copper', 'Silicon', 'Sand', 'Plastic', 'Aluminium','Electronics','Screens', and 'Cases'`)
        }
    })

    return;
};