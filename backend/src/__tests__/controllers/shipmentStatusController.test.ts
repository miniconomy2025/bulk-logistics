import { Request, Response, NextFunction } from 'express';
import { getShipmentStatuses } from '../../controllers/shipmentStatusController';
import shipmentStatus from '../../models/shipmentStatus';

jest.mock('../../models/shipmentStatus');
const mockedShipmentStatus = shipmentStatus as jest.Mocked<typeof shipmentStatus>;

describe('Shipment Status Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getShipmentStatuses', () => {
    it('should return all shipment statuses', async () => {
      const mockStatuses = [{ id: 1, name: 'pending' }, { id: 2, name: 'delivered' }];
      mockedShipmentStatus.findAllStatuses.mockResolvedValueOnce(mockStatuses as any);

      await getShipmentStatuses(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedShipmentStatus.findAllStatuses).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockStatuses);
    });

    it('should call next with error on failure', async () => {
      mockedShipmentStatus.findAllStatuses.mockRejectedValueOnce(new Error('DB error'));

      await getShipmentStatuses(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    });
  });
});
