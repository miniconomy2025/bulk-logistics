import { Request, Response } from 'express';
import ShipmentController from '../../controllers/shipmentController';
import { shipmentModel } from '../../models/shipmentRepository';

jest.mock('../../models/shipmentRepository');
const mockedShipmentModel = shipmentModel as jest.Mocked<typeof shipmentModel>;

describe('Shipment Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { query: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getShipments', () => {
    it('should return 400 for invalid dispatch date', async () => {
      mockReq.query = { dispatchDate: 'invalid-date' };

      await ShipmentController.getShipments(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid dispatch date' });
    });

    it('should return 400 for invalid status ID', async () => {
      mockReq.query = { statusId: 'not-a-number' };

      await ShipmentController.getShipments(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid status ID.' });
    });

    it('should return shipments successfully', async () => {
      const mockShipments = [{ id: 1, status: 'active' }];
      mockReq.query = { dispatchDate: '2024-01-01', statusId: '1' };
      mockedShipmentModel.findAllShipments.mockResolvedValueOnce(mockShipments as any);

      await ShipmentController.getShipments(mockReq as Request, mockRes as Response);

      expect(mockedShipmentModel.findAllShipments).toHaveBeenCalledWith('2024-01-01', 1);
      expect(jsonMock).toHaveBeenCalledWith(mockShipments);
    });

    it('should return 500 on error', async () => {
      mockReq.query = {};
      mockedShipmentModel.findAllShipments.mockRejectedValueOnce(new Error('DB error'));

      await ShipmentController.getShipments(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch shipments.' });
    });
  });

  describe('getActiveShipments', () => {
    it('should return active shipments successfully', async () => {
      const mockResult = { ok: true, value: { rows: [{ id: 1 }] } };
      mockedShipmentModel.findActiveShipments.mockResolvedValueOnce(mockResult as any);

      await ShipmentController.getActiveShipments(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ shipments: { id: 1 } });
    });

    it('should return 500 on error', async () => {
      const mockResult = { ok: false, error: 'DB error' };
      mockedShipmentModel.findActiveShipments.mockResolvedValueOnce(mockResult as any);

      await ShipmentController.getActiveShipments(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});
