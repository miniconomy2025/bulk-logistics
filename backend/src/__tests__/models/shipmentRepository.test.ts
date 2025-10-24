// __tests__/shipmentRepository.test.ts

import { shipmentModel } from '../../models/shipmentRepository';
import db from '../../config/database';
import { simulatedClock } from '../../utils/SimulatedClock';
import * as pickupRepo from '../../models/pickupRequestRepository';

jest.mock('../../config/database');
jest.mock('../../utils/SimulatedClock');

const mockedQuery = db.query as jest.Mock;
const mockedConnect = db.connect as jest.Mock;
const mockSimulatedClock = simulatedClock.getCurrentDate as jest.Mock;

jest.spyOn(pickupRepo, 'updateCompletionDate').mockImplementation(async () => {
  return Promise.resolve();
});

describe('shipmentRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllShipments', () => {
    it('should return all shipments', async () => {
      const mockRows = [{ shipment_id: 1 }];
      mockedQuery.mockResolvedValue({ rows: mockRows });

      const result = await shipmentModel.findAllShipments('2023-01-01', 2);

      expect(mockedQuery).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('findShipmentById', () => {
    it('should return shipment if found', async () => {
      mockedQuery.mockResolvedValue({ rowCount: 1, rows: [{ shipment_id: 1 }] });

      const result = await shipmentModel.findShipmentById(1);

      expect(result).toEqual({ shipment_id: 1 });
    });

    it('should return null if not found', async () => {
      mockedQuery.mockResolvedValue({ rowCount: 0, rows: [] });

      const result = await shipmentModel.findShipmentById(99);

      expect(result).toBeNull();
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update status and return shipment', async () => {
      const findMock = jest.spyOn(shipmentModel, 'findShipmentById').mockResolvedValue({ shipment_id: 1 });
      mockedQuery.mockResolvedValue({ rowCount: 1 });

      const result = await shipmentModel.updateShipmentStatus(1, 2, '2023-01-01');

      expect(findMock).toHaveBeenCalledWith(1);
      expect(result).toEqual({ shipment_id: 1 });
    });

    it('should throw if update fails', async () => {
      mockedQuery.mockResolvedValue({ rowCount: 0 });

      await expect(shipmentModel.updateShipmentStatus(1, 2)).rejects.toThrow('Failed to update shipment status');
    });
  });

  describe('assignItemToShipmentWithPickupRequestItemId', () => {
    it('should assign item to shipment', async () => {
      const client = { query: jest.fn() };
      await shipmentModel.assignItemToShipmentWithPickupRequestItemId(10, 20, client);

      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE pickup_request_item'), [10, 20]);
    });
  });

  describe('createShipment', () => {
    it('should return existing shipment if found', async () => {
      const client = { query: jest.fn() };
      client.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ shipment_id: 1 }] });

      const result = await shipmentModel.createShipment(1, new Date(), client);

      expect(result).toEqual({ shipment_id: 1 });
    });

    it('should insert and return new shipment if not found', async () => {
      const client = { query: jest.fn() };
      client.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [{ shipment_id: 2 }] });

      const result = await shipmentModel.createShipment(2, new Date(), client);

      expect(result).toEqual({ shipment_id: 2 });
    });
  });

  describe('createShipmentAndAssignItems', () => {
    it('should create shipment and assign items', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockedConnect.mockResolvedValue(client);
      mockSimulatedClock.mockReturnValue(new Date());
      const newShipment = { shipment_id: 1 };
      jest.spyOn(shipmentModel, 'createShipment').mockResolvedValue(newShipment);
      jest.spyOn(shipmentModel, 'assignItemToShipmentWithPickupRequestItemId').mockResolvedValue();
      jest.spyOn(pickupRepo, 'updateCompletionDate').mockResolvedValue(undefined);

      await shipmentModel.createShipmentAndAssignitems(1, 10);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback and throw on error', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockedConnect.mockResolvedValue(client);
      mockSimulatedClock.mockReturnValue(new Date());

      jest.spyOn(shipmentModel, 'createShipment').mockRejectedValue(new Error('DB error'));

      await expect(
        shipmentModel.createShipmentAndAssignitems(1, 10)
      ).rejects.toThrow('DB error');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findActiveShipments', () => {
    it('should return active shipment count', async () => {
      mockedQuery.mockResolvedValue({ rows: [{ active: 2 }] });

      const result = await shipmentModel.findActiveShipments();

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value).toEqual({ rows: [{ active: 2 }] });
      }
    });

    it('should return error if query fails', async () => {
      mockedQuery.mockRejectedValue(new Error('Query failed'));

      const result = await shipmentModel.findActiveShipments();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Query failed');
      }
    });
  });
});
