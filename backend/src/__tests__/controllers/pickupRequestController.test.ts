import { Request, Response, NextFunction } from 'express';
import {
  createPickupRequest,
  getPickupRequest,
  getPickupRequestsByCompany,
  getAllPickupRequests,
} from '../../controllers/pickupRequestController';
import { validatePickupRequest } from '../../validation/pickupRequestValidator';
import { calculateDeliveryCost } from '../../services/DeliveryCostCalculatorService';
import {
  savePickupRequest,
  findPickupRequestById,
  findPickupRequestsByCompanyName,
  findAllPickupRequests,
} from '../../models/pickupRequestRepository';
import { getItemDefinitions } from '../../models/pickupRequestItemRepository';
import { getMachines, updateMachineWeights } from '../../models/itemDefinitionRepository';
import { thohApiClient } from '../../client/thohClient';

jest.mock('../../validation/pickupRequestValidator');
jest.mock('../../services/DeliveryCostCalculatorService');
jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/pickupRequestItemRepository');
jest.mock('../../models/itemDefinitionRepository');
jest.mock('../../client/baseClient');
jest.mock('../../client/thohClient', () => ({
  thohApiClient: { getMachinesInformation: jest.fn() }
}));
jest.mock('../../client/notificationClient');
jest.mock('../../services/AutonomyService');
jest.mock('../../utils', () => ({
  simulatedClock: { getCurrentDate: jest.fn(() => new Date()) }
}));

describe('Pickup Request Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { body: {}, params: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });



  describe('getPickupRequest', () => {
    it('should return pickup request by id', async () => {
      mockReq.params = { id: '123' };
      (findPickupRequestById as jest.Mock).mockResolvedValueOnce({
        pickupRequestId: '123',
        cost: 500,
        paymentStatus: 'CONFIRMED',
        originCompanyName: 'TestCo',
        items: [],
      });

      await getPickupRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupRequestId: '123',
        })
      );
    });

    it('should call next with 404 if not found', async () => {
      mockReq.params = { id: '999' };
      (findPickupRequestById as jest.Mock).mockResolvedValueOnce(null);

      await getPickupRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('getPickupRequestsByCompany', () => {
    it('should return pickup requests for company', async () => {
      mockReq.params = { companyName: 'TestCo' };
      (findPickupRequestsByCompanyName as jest.Mock).mockResolvedValueOnce([
        {
          pickupRequestId: '123',
          cost: 500,
          paymentStatus: 'CONFIRMED',
          originCompanyName: 'TestCo',
          items: [],
        },
      ]);

      await getPickupRequestsByCompany(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Object)]));
    });
  });

  describe('getAllPickupRequests', () => {
    it('should return all pickup requests', async () => {
      (findAllPickupRequests as jest.Mock).mockResolvedValueOnce([{ pickupRequestId: '123' }]);

      await getAllPickupRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([{ pickupRequestId: '123' }]);
    });

    it('should call next with 404 if no requests found', async () => {
      (findAllPickupRequests as jest.Mock).mockResolvedValueOnce(null);

      await getAllPickupRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });
});
