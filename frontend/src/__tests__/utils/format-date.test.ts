import { formatDate } from "../../utils/format-date";

describe("format-date", () => {
    describe("formatDate", () => {
        it("should format a valid date string correctly", () => {
            expect(formatDate("2024-01-15")).toBe("15 January 2024");
            expect(formatDate("2023-12-31")).toBe("31 December 2023");
            expect(formatDate("2024-02-29")).toBe("29 February 2024");
        });

        it("should handle single digit days and months", () => {
            expect(formatDate("2024-01-01")).toBe("01 January 2024");
            expect(formatDate("2024-09-05")).toBe("05 September 2024");
        });

        it("should handle different months correctly", () => {
            expect(formatDate("2024-01-01")).toBe("01 January 2024");
            expect(formatDate("2024-06-15")).toBe("15 June 2024");
            expect(formatDate("2024-12-25")).toBe("25 December 2024");
        });

        it("should handle edge cases", () => {
            expect(formatDate("2000-01-01")).toBe("01 January 2000");
            expect(formatDate("9999-12-31")).toBe("31 December 9999");
        });

        it("should handle invalid date formats gracefully", () => {
            expect(() => formatDate("invalid-date")).toThrow();
        });

        it("should handle empty string", () => {
            expect(() => formatDate("")).toThrow();
        });

        it("should handle null and undefined inputs", () => {
            expect(() => formatDate(null as any)).toThrow();
            expect(() => formatDate(undefined as any)).toThrow();
        });
    });
});
