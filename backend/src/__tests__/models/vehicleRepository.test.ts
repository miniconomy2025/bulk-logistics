// __tests__/vehicleRepository.test.ts
import * as vehicleRepo from "../../models/vehicleRepository";
import db from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn(),
}));

describe("vehicleRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAvailableVehicles", () => {
    it("should return rows from the query", async () => {
      const mockRows = [{ vehicle_id: 1, name: "Truck1" }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const result = await vehicleRepo.findAvailableVehicles("2025-10-15");
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM get_available_vehicles(p_dispatch_date => $1)",
        ["2025-10-15"]
      );
      expect(result).toEqual(mockRows);
    });
  });

  describe("addVehicle", () => {
    it("should return success when insertion succeeds", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      const vehicleInfo = {
        type: "Truck",
        purchase_date: "2025-01-01",
        operational_cost: 100,
        load_capacity: 2000,
      };

      const result = await vehicleRepo.addVehicle(vehicleInfo);
      expect(db.query).toHaveBeenCalledWith(
        "CALL insert_vehicle_info(p_name => $1, p_purchase_date => $2, p_daily_operational_cost => $3, p_maximum_capacity => $4)",
        [vehicleInfo.type, vehicleInfo.purchase_date, vehicleInfo.operational_cost, vehicleInfo.load_capacity]
      );
      expect(result).toEqual({ success: true, message: "Vehicle added successfully" });
    });

    it("should throw if insertion fails (rowCount 0)", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      const vehicleInfo = {
        type: "Truck",
        purchase_date: "2025-01-01",
        operational_cost: 100,
        load_capacity: 2000,
      };

      await expect(vehicleRepo.addVehicle(vehicleInfo)).rejects.toThrow("Failed to add vehicle");
    });
  });

  describe("getTotalVehicleDeliveryCounts", () => {
    it("should return delivery counts", async () => {
      const mockRows = [
        { vehicle_id: 1, vehicle_type: "Truck", deliveries_completed: 5 },
      ];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const result = await vehicleRepo.getTotalVehicleDeliveryCounts();

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
      expect(result).toEqual(mockRows);
    });
  });

  describe("getAllVehiclesWithType", () => {
    it("should return transformed rows with proper types", async () => {
      const mockDbRow = {
        vehicle_id: 1,
        is_active: true,
        vehicle_type_id: 10,
        purchase_date: "2020-01-01",
        disabled_date: null,
        daily_operational_cost: "123.45",
        vt_id: 10,
        vt_name: "Truck",
        vt_capacity_type_id: 1,
        vt_max_capacity: 5000,
        vt_max_pickups: 3,
        vt_max_dropoffs: 2,
        is_in_active_shipment: true,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockDbRow] });

      const result = await vehicleRepo.getAllVehiclesWithType();

      expect(result).toHaveLength(1);
      expect(result[0].daily_operational_cost).toBeCloseTo(123.45);
      expect(result[0]?.vehicle_type?.name).toBe("Truck");
      expect(result[0].is_in_active_shipment).toBe(true);
    });
  });

  describe("getVehicleDeliveriesByDateRange", () => {
    it("should query with ISO date strings and return rows", async () => {
      const mockRows = [{ vehicle_id: 1, vehicle_type: "Van", deliveries_completed: 2 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-31");

      const result = await vehicleRepo.getVehicleDeliveriesByDateRange(startDate, endDate);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [
        startDate.toISOString(),
        endDate.toISOString(),
      ]);
      expect(result).toEqual(mockRows);
    });
  });

  describe("getVehicleForShipmentId", () => {
    it("should return vehicle with type when found", async () => {
      const mockRow = {
        vehicle_id: 1,
        is_active: true,
        vehicle_type_id: 5,
        purchase_date: "2023-01-01",
        vt_id: 5,
        vt_name: "Truck",
        vt_cost: 150,
        vt_capacity_type_id: 2,
        vt_max_capacity: 3000,
        vt_max_pickups: 4,
        vt_max_dropoffs: 3,
      };
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockRow] });

      const result = await vehicleRepo.getVehicleForShipmentId(123);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [123]);
      expect(result).toMatchObject({
        vehicle_id: 1,
        is_active: true,
        daily_operational_cost: 150,
        vehicle_type: {
          vehicle_type_id: 5,
          name: "Truck",
          capacity_type_id: 2,
          maximum_capacity: 3000,
          max_pickups_per_day: 4,
          max_dropoffs_per_day: 3,
        },
      });
    });

    it("should return null when no rows found", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await vehicleRepo.getVehicleForShipmentId(999);
      expect(result).toBeNull();
    });
  });

  describe("updateVehicleStatus", () => {
    it("should return updated vehicle info on success", async () => {
      const updatedRow = {
        vehicle_id: 1,
        is_active: false,
        disabled_date: "2025-10-10",
      };
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [updatedRow] });

      const result = await vehicleRepo.updateVehicleStatus(1, false, "2025-10-10");

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [false, "2025-10-10", 1]);
      expect(result).toEqual({
        vehicle_id: 1,
        is_active: false,
        disabled_date: "2025-10-10",
        message: "Vehicle status successfully updated.",
      });
    });

    it("should throw error if update fails", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(vehicleRepo.updateVehicleStatus(1, true, null)).rejects.toThrow(
        "Vehicle with ID 1 not found or update failed."
      );
    });
  });

  describe("findAllVehiclesWithShipments", () => {
    it("should return rows from stored procedure call", async () => {
      const mockRows = [{ operationalCost: 150 }];
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

      const result = await vehicleRepo.findAllVehiclesWithShipments("2025-10-15");
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM get_OpCost_For_Vehicles_WithShipments(p_dispatch_date => $1)",
        ["2025-10-15"]
      );
      expect(result).toEqual(mockRows);
    });
  });
});
