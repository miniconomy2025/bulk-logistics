import { Request, Response, NextFunction } from 'express';
import { bankNotification } from '../../controllers/bank-notification';
import { createLedgerEntry, updatePaymentStatusForPickupRequest } from '../../models/transactionsRepository';
import { findAccountNumberByCompanyName } from '../../models/companyRepository';

jest.mock('../../models/transactionsRepository');
jest.mock('../../models/companyRepository');

describe('Bank Notification Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { body: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bankNotification', () => {
    it('should return 400 for invalid transaction data', async () => {
      mockReq.body = { transaction_number: '123' };
      (findAccountNumberByCompanyName as jest.Mock).mockResolvedValueOnce('ACC123');

      await bankNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid transaction data' });
    });

    it('should return 400 if transaction does not involve our account', async () => {
      mockReq.body = {
        transaction_number: '123',
        status: 'CONFIRMED',
        amount: 100,
        timestamp: Date.now(),
        from: 'OTHER_ACC',
        to: 'ANOTHER_ACC',
      };
      (findAccountNumberByCompanyName as jest.Mock).mockResolvedValueOnce('OUR_ACC');

      await bankNotification(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Transaction does not involve our account' });
    });
  });
});
