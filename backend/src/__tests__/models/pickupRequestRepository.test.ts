// __tests__/pickupRequestRepository.test.ts

import {
  savePickupRequest,
  findPickupRequestById,
  findPickupRequestsByCompanyName,
  findPaidAndUnshippedRequests,
  updateCompletionDate,
  updatePickupRequestStatuses,
  findAllPickupRequests,
} from '../../models/pickupRequestRepository';

import db from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../config/database');
jest.mock('uuid');
const mockedQuery = db.query as jest.Mock;
const mockUUID = uuidv4 as jest.Mock;

describe('pickupRequestRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('savePickupRequest', () => {
    it('should save pickup request and return result', async () => {
      const mockPickupRequest = {
        requestingCompany: 'A',
        originCompany: 'B',
        destinationCompany: 'C',
        originalExternalOrderId: 'ORD123',
        cost: 100,
        requestDate: new Date(),
        items: [],
      };
      const mockResult = {
        rows: [{
          pickupRequestId: 1,
          paymentReferenceId: 'uuid-123',
          cost: 100,
          bulkLogisticsBankAccountNumber: '1234567890'
        }]
      };
      mockUUID.mockReturnValue('uuid-123');
      mockedQuery.mockResolvedValue(mockResult);

      const result = await savePickupRequest(mockPickupRequest);

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw if DB returns no rows', async () => {
      mockedQuery.mockResolvedValue({ rows: [] });
      await expect(savePickupRequest({
        requestingCompany: 'A',
        originCompany: 'B',
        destinationCompany: 'C',
        originalExternalOrderId: 'ORD123',
        cost: 100,
        requestDate: new Date(),
        items: [],
      })).rejects.toThrow('Failed to create pickup request');
    });
  });

  describe('findPickupRequestById', () => {
    it('should return pickup request if found', async () => {
      const mockRow = { pickupRequestId: 1 };
      mockedQuery.mockResolvedValue({ rows: [mockRow] });

      const result = await findPickupRequestById('1');

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toEqual(mockRow);
    });

    it('should return null if not found', async () => {
      mockedQuery.mockResolvedValue({ rows: [] });

      const result = await findPickupRequestById('1');

      expect(result).toBeNull();
    });
  });

  describe('findPickupRequestsByCompanyName', () => {
    it('should return all pickup requests for a company', async () => {
      const mockRows = [{ pickupRequestId: 1 }, { pickupRequestId: 2 }];
      mockedQuery.mockResolvedValue({ rows: mockRows });

      const result = await findPickupRequestsByCompanyName('CompanyX');

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('findPaidAndUnshippedRequests', () => {
    it('should return all paid and unshipped requests', async () => {
      const mockRows = [{ pickupRequestId: 1 }];
      mockedQuery.mockResolvedValue({ rows: mockRows });

      const result = await findPaidAndUnshippedRequests();

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('updateCompletionDate', () => {
    it('should call client.query with correct query and params', async () => {
      const mockClient = { query: jest.fn() };
      const date = new Date();
      const id = 123;

      await updateCompletionDate(id, date, mockClient);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE pickup_requests SET completion_date = $1 WHERE pickup_request_id = $2',
        [date, id]
      );
    });
  });

  describe('updatePickupRequestStatuses', () => {
    it('should return number of updated rows', async () => {
      mockedQuery.mockResolvedValue({ rowCount: 5 });

      const result = await updatePickupRequestStatuses(new Date());

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 if rowCount is undefined', async () => {
      mockedQuery.mockResolvedValue({});

      const result = await updatePickupRequestStatuses(new Date());

      expect(result).toBe(0);
    });
  });

  describe('findAllPickupRequests', () => {
    it('should return all pickup requests from view', async () => {
      const mockRows = [{ pickupRequestId: 1 }];
      mockedQuery.mockResolvedValue({ rows: mockRows });

      const result = await findAllPickupRequests();

      expect(mockedQuery).toHaveBeenCalledWith('SELECT * FROM pickup_requests_view');
      expect(result).toEqual(mockRows);
    });
  });
});
