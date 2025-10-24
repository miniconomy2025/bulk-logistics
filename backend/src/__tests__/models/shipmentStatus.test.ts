import ShipmentStatusModel from "../../models/shipmentStatus";
import db from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn(),
}));

describe("ShipmentStatusModel", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return all shipment statuses", async () => {
    const mockRows = [
      { shipmentStatusId: 1, name: "PENDING" },
      { shipmentStatusId: 2, name: "PICKED_UP" },
    ];

    (db.query as jest.Mock).mockResolvedValue({ rows: mockRows });

    const result = await ShipmentStatusModel.findAllStatuses();

    expect(db.query).toHaveBeenCalledWith(
      `SELECT shipment_status_id as "shipmentStatusId", name FROM shipment_status`
    );
    expect(result).toEqual(mockRows);
  });

  it("should throw if database query fails", async () => {
    (db.query as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await expect(ShipmentStatusModel.findAllStatuses()).rejects.toThrow("DB Error");
  });
});
