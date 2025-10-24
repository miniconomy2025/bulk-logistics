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
        vehicleType: "medium truck",
        maximum_capacity: 500,
        capacity_type_id: 1,
        max_pickups_per_day: 5,
        max_dropoffs_per_day: 100,
    };

    const mockVehicle2: AvailableVehicle = {
        vehicle_id: 102,
        vehicle_type_id: 2,
        is_active: true,
        vehicleType: "medium truck",
        maximum_capacity: 500,
        capacity_type_id: 1,
        max_pickups_per_day: 5,
        max_dropoffs_per_day: 100,
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

        it("should use multiple vehicles when items cannot fit into a single vehicle", async () => {
            // Arrange: Create two items that together exceed the capacity of one vehicle
            const largeItem1: PickupToShipmentItemDetails = {
                pickup_request_id: 3,
                pickup_request_item_id: 301,
                itemName: "heavy-screens",
                quantity: 400, // nearly fills a single vehicle
                capacity_type_id: 1,
                originCompanyUrl: "api/companies/heavy-supplier",
                destinationCompanyUrl: "api/companies/pear",
                originalExternalOrderId: "EXT-ORDER-400",
            };

            const largeItem2: PickupToShipmentItemDetails = {
                pickup_request_id: 4,
                pickup_request_item_id: 302,
                itemName: "heavy-cases",
                quantity: 300, // cannot fit into remaining capacity of same vehicle
                capacity_type_id: 1,
                originCompanyUrl: "api/companies/case-supplier",
                destinationCompanyUrl: "api/companies/pear",
                originalExternalOrderId: "EXT-ORDER-400",
            };

            const request1: PickupRequestWithDetails = {
                pickupRequestId: 3,
                requestingCompanyName: "pear",
                originCompanyName: "heavy-supplier",
                destinationCompanyName: "pear",
                originalExternalOrderId: "EXT-ORDER-400",
                cost: 5000,
                requestDate: new Date("2025-10-10T00:00:00Z"),
                completionDate: null,
                paymentStatus: "PAID",
                paymentDate: new Date("2025-10-10T00:00:00Z"),
                items: [largeItem1],
            };

            const request2: PickupRequestWithDetails = {
                pickupRequestId: 4,
                requestingCompanyName: "pear",
                originCompanyName: "case-supplier",
                destinationCompanyName: "pear",
                originalExternalOrderId: "EXT-ORDER-400",
                cost: 5000,
                requestDate: new Date("2025-10-10T00:00:00Z"),
                completionDate: null,
                paymentStatus: "PAID",
                paymentDate: new Date("2025-10-10T00:00:00Z"),
                items: [largeItem2],
            };

            const smallCapacityVehicle1: AvailableVehicle = {
                vehicle_id: 201,
                vehicle_type_id: 2,
                is_active: true,
                vehicleType: "medium truck",
                maximum_capacity: 500,
                capacity_type_id: 1,
                max_pickups_per_day: 5,
                max_dropoffs_per_day: 100,
            };

            const smallCapacityVehicle2: AvailableVehicle = {
                vehicle_id: 202,
                vehicle_type_id: 2,
                is_active: true,
                vehicleType: "medium truck",
                maximum_capacity: 500,
                capacity_type_id: 1,
                max_pickups_per_day: 5,
                max_dropoffs_per_day: 100,
            };

            mockedFindPaidAndUnshippedRequests.mockResolvedValue([request1, request2]);
            mockedFindAvailableVehicles.mockResolvedValue([smallCapacityVehicle1, smallCapacityVehicle2]);
            mockedSimulatedClock.getCurrentDate.mockReturnValue(new Date("2025-10-10T10:00:00Z"));

            const plannerService = new ShipmentPlannerService();

            const result = await plannerService.planDailyShipments();

            // Both requests should be planned
            expect(result.plannedRequestIds).toHaveLength(2);
            // Two vehicles should be used since combined items exceed one vehicle’s capacity
            expect(result.createdShipmentsPlan).toHaveLength(2);

            const [plan1, plan2] = result.createdShipmentsPlan;

            const totalPlannedItems = [...plan1.itemsToAssign, ...plan2.itemsToAssign];

            // Ensure all items were planned
            expect(totalPlannedItems).toEqual(expect.arrayContaining([largeItem1, largeItem2]));

            // Plans should be in different vehicles
            expect(plan1.vehicle.vehicle_id).not.toBe(plan2.vehicle.vehicle_id);
        });
    });
});
