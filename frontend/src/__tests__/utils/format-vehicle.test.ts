import { formatVehicleName } from "../../utils/format-vehicle";

describe("format-vehicle", () => {
    describe("formatVehicleName", () => {
        it("should format vehicle names with underscores correctly", () => {
            expect(formatVehicleName("truck_heavy")).toBe("Truck Heavy");
            expect(formatVehicleName("van_small")).toBe("Van Small");
            expect(formatVehicleName("car_electric")).toBe("Car Electric");
        });

        it("should handle single word vehicle names", () => {
            expect(formatVehicleName("truck")).toBe("Truck");
            expect(formatVehicleName("van")).toBe("Van");
            expect(formatVehicleName("car")).toBe("Car");
        });

        it("should handle multiple underscores", () => {
            expect(formatVehicleName("truck_heavy_duty")).toBe("Truck Heavy Duty");
            expect(formatVehicleName("van_delivery_express")).toBe("Van Delivery Express");
        });

        it("should handle empty string", () => {
            expect(formatVehicleName("")).toBe("");
        });

        it("should handle single character words", () => {
            expect(formatVehicleName("a_b_c")).toBe("A B C");
        });

        it("should handle already capitalized words", () => {
            expect(formatVehicleName("Truck_Heavy")).toBe("Truck Heavy");
            expect(formatVehicleName("VAN_SMALL")).toBe("Van Small");
        });

        it("should handle mixed case", () => {
            expect(formatVehicleName("tRuCk_HeAvY")).toBe("Truck Heavy");
        });

        it("should handle numbers in vehicle names", () => {
            expect(formatVehicleName("truck_2024")).toBe("Truck 2024");
            expect(formatVehicleName("van_model_3")).toBe("Van Model 3");
        });

        it("should handle special characters", () => {
            expect(formatVehicleName("truck-special")).toBe("Truck-special");
            expect(formatVehicleName("van.delivery")).toBe("Van.delivery");
        });
    });
});
