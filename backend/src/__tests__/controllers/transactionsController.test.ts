import { Request, Response } from 'express';
import {
  getTransactionById,
  createTransaction,
  getTransactionTotals,
  getMonthlyTransactions,
  getTopRevenueSources,
  getCostsBreakdown,
  getRecentTransactions,
} from '../../controllers/transactionsController';
import {
  findTransactionById,
  insertIntoTransactionLedger,
  getTotals,
  getMonthlyRevenueExpenses,
  getTopRevenueSourcesRepo,
  getTransactionBreakdown,
  getRecentTransactionRepo,
  getTotalTransactionsCountRepo,
} from '../../models/transactionsRepository';

jest.mock('../../models/transactionsRepository');

describe('Transactions Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { params: {}, body: {}, query: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactionById', () => {
    it('should return transaction by id', async () => {
      mockReq.params = { id: '1' };
      (findTransactionById as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rowCount: 1, rows: [{ id: 1 }] } });

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ transaction: { id: 1 } });
    });

    it('should return 404 if transaction not found', async () => {
      mockReq.params = { id: '999' };
      (findTransactionById as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rowCount: 0, rows: [] } });

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Transaction not found.' });
    });

    it('should return 500 on error', async () => {
      mockReq.params = { id: '1' };
      (findTransactionById as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'DB error' });

      await getTransactionById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      mockReq.body = { amount: 100, transaction_category_id: 1 };
      (insertIntoTransactionLedger as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ id: 1 }] } });

      await createTransaction(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ transaction: { id: 1 } });
    });

    it('should return 500 on error', async () => {
      mockReq.body = { amount: 100 };
      (insertIntoTransactionLedger as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'DB error' });

      await createTransaction(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('getTransactionTotals', () => {
    it('should return transaction totals', async () => {
      (getTotals as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ total: 1000 }] } });

      await getTransactionTotals(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ transaction: [{ total: 1000 }] });
    });

    it('should return 500 on error', async () => {
      (getTotals as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'DB error' });

      await getTransactionTotals(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getMonthlyTransactions', () => {
    it('should return monthly transactions', async () => {
      (getMonthlyRevenueExpenses as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ month: 1 }] } });

      await getMonthlyTransactions(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getTopRevenueSources', () => {
    it('should return top revenue sources', async () => {
      (getTopRevenueSourcesRepo as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ source: 'A' }] } });

      await getTopRevenueSources(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getCostsBreakdown', () => {
    it('should return costs breakdown', async () => {
      (getTransactionBreakdown as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ cost: 100 }] } });

      await getCostsBreakdown(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with pagination', async () => {
      mockReq.query = { page: '1', limit: '20' };
      (getRecentTransactionRepo as jest.Mock).mockResolvedValueOnce({ ok: true, value: { rows: [{ id: 1 }] } });
      (getTotalTransactionsCountRepo as jest.Mock).mockResolvedValueOnce({ ok: true, value: 100 });

      await getRecentTransactions(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        totalPages: 5,
        totalTransactions: 100,
        transactions: [{ id: 1 }],
      });
    });

    it('should return 400 for invalid page', async () => {
      mockReq.query = { page: '-1' };

      await getRecentTransactions(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid page number. Page must be a positive integer.' });
    });


  });
});
