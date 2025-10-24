import { Request, Response, NextFunction } from 'express';
import { startSimulation, truckFailure, truckDelivery, stopSimulation } from '../../controllers/thohController';
import { beginSimulation, handleTruckFailure, handleTruckDelivery } from '../../services/thohService';
import { autonomyService } from '../../services/AutonomyService';
import axios from 'axios';

jest.mock('../../services/thohService');
jest.mock('../../services/AutonomyService', () => ({
  autonomyService: { stop: jest.fn() }
}));
jest.mock('../../client/notificationClient');
jest.mock('axios');

describe('Thoh Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });
    mockReq = { body: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSimulation', () => {
    it('should start simulation and return 200', async () => {
      mockReq.body = { epochStartTime: 1234567890 };

      await startSimulation(mockReq as Request, mockRes as Response, mockNext);

      expect(beginSimulation).toHaveBeenCalledWith(1234567890);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('truckFailure', () => {
    it('should return 204 on successful failure handling', async () => {
      mockReq.body = { truckId: 1, reason: 'breakdown' };
      (handleTruckFailure as jest.Mock).mockResolvedValueOnce({ success: true });

      await truckFailure(mockReq as Request, mockRes as Response, mockNext);

      expect(handleTruckFailure).toHaveBeenCalledWith({ truckId: 1, reason: 'breakdown' });
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it('should return 418 on failure', async () => {
      mockReq.body = { truckId: 1 };
      (handleTruckFailure as jest.Mock).mockResolvedValueOnce({ success: false });

      await truckFailure(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(418);
    });
  });

  describe('truckDelivery', () => {
    it('should handle truck delivery and return 200', async () => {
      mockReq.body = { truckId: 1, deliveryInfo: {} };

      await truckDelivery(mockReq as Request, mockRes as Response, mockNext);

      expect(handleTruckDelivery).toHaveBeenCalledWith({ truckId: 1, deliveryInfo: {} });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('stopSimulation', () => {
    it('should stop simulation and trigger migration', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({});

      await stopSimulation(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Simulation stopped and migration job triggered.' });
    });

    it('should return 500 if GitHub workflow fails', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('GitHub error'));

      await stopSimulation(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Simulation stopped but failed to trigger migration job.' });
    });
  });
});
