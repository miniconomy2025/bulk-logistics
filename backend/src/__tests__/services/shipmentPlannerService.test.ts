import { findPaidAndUnshippedRequests } from "../../models/pickupRequestRepository";
import { findAvailableVehicles } from "../../models/vehicleRepository";
import type { AvailableVehicle, PickupRequestWithDetails, PickupToShipmentItemDetails } from "../../types";
import { simulatedClock } from "../../utils";
import { ShipmentPlannerService } from "../../services/ShipmentPlannerService";

// Mocking the external dependencies
jest.mock("../../models/pickupRequestRepository");
jest.mock("../../models/vehicleRepository");
jest.mock("../../utils", () => ({
    simulatedClock: {
        getCurrentDate: jest.fn(),
    },
}));

// Cast the mocked imports for type safety
const mockedFindPaidAndUnshippedRequests = findPaidAndUnshippedRequests as jest.Mock;
const mockedFindAvailableVehicles = findAvailableVehicles as jest.Mock;
const mockedSimulatedClock = simulatedClock as jest.Mocked<typeof simulatedClock>;

describe("ShipmentPlannerService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // RequestItems Mocks
    const mockItem1 = {
        pickup_request_id: 1,
        pickup_request_item_id: 201,
        itemName: "screens",
        quantity: 250,
        capacity_type_id: 1,
        originCompanyUrl: "api/companies/screen-supplier",
        destinationCompanyUrl: "api/companies/pear",
        originalExternalOrderId: "EXT-ORDER-123",
    };

    const mockItem2: PickupToShipmentItemDetails = {
        pickup_request_id: 2,
        pickup_request_item_id: 202,
        itemName: "cases",
        quantity: 200,
        capacity_type_id: 1,
        originCompanyUrl: "api/companies/case-supplier",
        destinationCompanyUrl: "api/companies/pear",
        originalExternalOrderId: "EXT-ORDER-123",
    };

    // Pickup Requests Mocks
    const pickupRequestMock1: PickupRequestWithDetails = {
        pickupRequestId: 1,
        requestingCompanyName: "pear",
        originCompanyName: "case-supplier",
        destinationCompanyName: "pear",
        originalExternalOrderId: "EXT-ORDER-123",
        cost: 3000,
        requestDate: new Date("2025-10-10T00:00:00Z"),
        completionDate: null,
        paymentStatus: "PAID",
        paymentDate: new Date("2025-10-10T00:00:00Z"),
        items: [mockItem1],
    };

    const pickupRequestMock2: PickupRequestWithDetails = {
        pickupRequestId: 2,
        requestingCompanyName: "pear",
        originCompanyName: "screen-supplier",
        destinationCompanyName: "pear",
        originalExternalOrderId: "EXT-ORDER-123",
        cost: 2500,
        requestDate: new Date("2025-10-10T00:00:00Z"),
        completionDate: null,
        paymentStatus: "PAID",
        paymentDate: new Date("2025-10-10T00:00:00Z"),
        items: [mockItem2],
    };

    // Vehicle data mock
    const mockVehicle: AvailableVehicle = {
        vehicle_id: 101,
        vehicle_type_id: 2,
        is_active: true,
        vehicleType: "small truck",
        maximum_capacity: 500,
        capacity_type_id: 1,
        max_pickups_per_day: 250,
        max_dropoffs_per_day: 500,
    };

    describe("planDailyShipments", () => {
        it("should correctly plan a request that fits perfectly into a single vehicle", async () => {
            
            mockedFindPaidAndUnshippedRequests.mockResolvedValue([pickupRequestMock1, pickupRequestMock2]);
            mockedFindAvailableVehicles.mockResolvedValue([mockVehicle]);

            mockedSimulatedClock.getCurrentDate.mockReturnValue(new Date("2025-10-10T10:00:00Z"));

            const plannerService = new ShipmentPlannerService();
            const result = await plannerService.planDailyShipments();

            expect(result.plannedRequestIds).toHaveLength(2);
            expect(result.createdShipmentsPlan).toHaveLength(1);

            const shipmentPlan = result.createdShipmentsPlan[0];
            expect(shipmentPlan.vehicle.vehicle_id).toBe(101);
            expect(shipmentPlan.itemsToAssign).toHaveLength(2);
            expect(shipmentPlan.itemsToAssign).toEqual(expect.arrayContaining([mockItem1, mockItem2]));
            expect(Array.from(shipmentPlan.originCompanyNames)).toEqual(["case-supplier", "screen-supplier"]);

            const totalQuantity = mockItem1.quantity + mockItem2.quantity;

            expect(shipmentPlan.vehicle.capacityRemaining).toBe(mockVehicle.maximum_capacity - totalQuantity);
            expect(shipmentPlan.vehicle.pickupsAssignedToday).toBe(2);
        });

        it("should not create any shipment plan when there are no pending requests", async () => {

            mockedFindPaidAndUnshippedRequests.mockResolvedValue([]);
            mockedFindAvailableVehicles.mockResolvedValue([mockVehicle]);

            mockedSimulatedClock.getCurrentDate.mockReturnValue(new Date("2025-10-15T08:00:00Z"));

            const plannerService = new ShipmentPlannerService();

            const result = await plannerService.planDailyShipments();

            expect(result.plannedRequestIds).toHaveLength(0);
            expect(result.createdShipmentsPlan).toHaveLength(0);

            expect(mockedFindPaidAndUnshippedRequests).toHaveBeenCalledTimes(1);
            expect(mockedFindAvailableVehicles).toHaveBeenCalledTimes(1);
        });

        it("should not create any shipment plan when there are no vehicles", async () => {

            mockedFindPaidAndUnshippedRequests.mockResolvedValue([pickupRequestMock1, pickupRequestMock2]);
            mockedFindAvailableVehicles.mockResolvedValue([]);

            mockedSimulatedClock.getCurrentDate.mockReturnValue(new Date("2025-10-15T08:00:00Z"));

            const plannerService = new ShipmentPlannerService();

            const result = await plannerService.planDailyShipments();

            expect(result.plannedRequestIds).toHaveLength(0);
            expect(result.createdShipmentsPlan).toHaveLength(0);

            expect(mockedFindPaidAndUnshippedRequests).toHaveBeenCalledTimes(1);
            expect(mockedFindAvailableVehicles).toHaveBeenCalledTimes(1);
        });
    });
});
