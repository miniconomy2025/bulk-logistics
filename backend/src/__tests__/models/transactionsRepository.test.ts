// __tests__/transactionsRepository.test.ts
import * as transactionsRepo from "../../models/transactionsRepository";
import db from "../../config/database";

jest.mock("../../config/database", () => ({
  query: jest.fn(),
}));

describe("transactionsRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTotalTransactionsCountRepo", () => {
    it("should return the total transaction count", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: "42" }] });

      const result = await transactionsRepo.getTotalTransactionsCountRepo();

      expect(result.ok).toBe(true);

      if (result.ok) expect(result.value).toBe(42);
    });

    it("should return an error if query fails", async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error("DB error"));

      const result = await transactionsRepo.getTotalTransactionsCountRepo();

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe("findTransactionById", () => {
    it("should return transaction by ID", async () => {
      const mockData = { rows: [{ transaction_ledger_id: 1 }] };
      (db.query as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await transactionsRepo.findTransactionById("1");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(mockData);
    });
  });

  describe("getMonthlyRevenueExpenses", () => {
    it("should return revenue and expenses grouped by month", async () => {
      const mockData = { rows: [{ year: 2025, month: 10, revenue: 1000, expenses: 500 }] };
      (db.query as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await transactionsRepo.getMonthlyRevenueExpenses();

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(mockData);
    });
  });

  describe("getTransactionBreakdown", () => {
    it("should return category breakdown", async () => {
      const mockData = { rows: [{ category: "PURCHASE", total: 1000 }] };
      (db.query as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await transactionsRepo.getTransactionBreakdown();

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(mockData);
    });
  });

  describe("getRecentTransactionRepo", () => {
    it("should return paginated recent transactions", async () => {
      const mockData = { rows: [{ amount: 200 }] };
      (db.query as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await transactionsRepo.getRecentTransactionRepo(1, 10);

      expect(db.query).toHaveBeenCalledWith(expect.any(String), [10, 0]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(mockData);
    });
  });

  describe("getTopRevenueSourcesRepo", () => {
    it("should return top revenue sources", async () => {
      const mockData = { rows: [{ company: "Acme", total: 1000 }] };
      (db.query as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await transactionsRepo.getTopRevenueSourcesRepo();

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(mockData);
    });
  });

  describe("getAllLoans", () => {
    it("should return loan data", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ loan_id: 1, loan_amount: 1000, interest_rate: 5, loan_number: "LN001" }],
      });

      const result = await transactionsRepo.getAllLoans();

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        id: 1,
        loanAmount: 1000,
        interestRate: 5,
        loanNumber: "LN001",
      });
    });

    it("should return empty array if no loans found", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await transactionsRepo.getAllLoans();

      expect(result).toEqual([]);
    });
  });

  describe("updatePaymentStatusForPickupRequest", () => {
    it("should update payment status based on UUID", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await transactionsRepo.updatePaymentStatusForPickupRequest({
        transaction_number: "abc",
        status: "COMPLETED",
        amount: 100,
        timestamp: 123456,
        description: "d290f1ee-6c54-4b01-90e6-d701748f0851",
        from: "123",
        to: "456",
      });

      expect(result).toBe(1);
    });

    it("should update payment status based on numeric id", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 2 });

      const result = await transactionsRepo.updatePaymentStatusForPickupRequest({
        transaction_number: "abc",
        status: "COMPLETED",
        amount: 100,
        timestamp: 123456,
        description: "12345",
        from: "123",
        to: "456",
      });

      expect(result).toBe(2);
    });
  });
});
