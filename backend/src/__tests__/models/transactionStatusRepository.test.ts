// __tests__/transactionStatusRepository.test.ts
import * as transactionStatusRepo from "../../models/transactionStatusRepository";
import db from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn(),
}));

describe("transactionStatusRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTransactionStatusByName", () => {
    it("should return a TransactionStatus when found", async () => {
      const mockStatus = { transaction_status_id: 1 };
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockStatus],
      });

      const result = await transactionStatusRepo.getTransactionStatusByName("COMPLETED");

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ["COMPLETED"]
      );
      expect(result).toEqual(mockStatus);
    });

    it("should return null when no status is found", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

      const result = await transactionStatusRepo.getTransactionStatusByName("NON_EXISTENT");

      expect(result).toBeNull();
    });

    it("should throw if db.query throws", async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error("DB error"));

      await expect(transactionStatusRepo.getTransactionStatusByName("ERROR"))
        .rejects.toThrow("DB error");
    });
  });
});
