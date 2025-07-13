/**
 * Formats a vehicle name string (e.g., "truck_heavy") into "Truck Heavy".
 * @param vehicle - The vehicle string to format.
 * @returns The formatted vehicle name.
 */
export function formatVehicleName(vehicle: string): string {
    return vehicle
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
