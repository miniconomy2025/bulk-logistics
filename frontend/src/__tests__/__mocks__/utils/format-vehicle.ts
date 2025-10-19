export const formatVehicleName = jest.fn((vehicle: string) => {
    return vehicle
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
});
