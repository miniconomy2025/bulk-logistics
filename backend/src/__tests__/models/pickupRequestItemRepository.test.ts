import { findUnshippedItems, getItemDefinitions } from '../../models/pickupRequestItemRepository';
import db from '../../config/database';

jest.mock('../../config/database');
const mockedQuery = db.query as jest.Mock;

describe('pickupRequestItemRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUnshippedItems', () => {
    it('should return unshipped items from the database', async () => {
      const mockRows = [
        {
          pickup_request_id: 1,
          original_external_order_id: 'ORD123',
          request_date: new Date(),
          completion_date: null,
          pickup_request_item_id: 101,
          item_definition_id: 1001,
          quantity: 3,
          item_name: 'Widget A',
          capacity_type_id: 1,
          related_pickup_request_id: 1,
          status: 'COMPLETED',
        },
      ];

      mockedQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await findUnshippedItems();

      expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('FROM pickup_requests p'));
      expect(result).toEqual(mockRows);
    });
  });

  describe('getItemDefinitions', () => {
    it('should return item definitions from the database', async () => {
      const mockRows = [
        {
          item_definition_id: 1001,
          item_name: 'Widget A',
          capacity_type_name: 'Box',
          weight_per_unit: 1.5,
        },
        {
          item_definition_id: 1002,
          item_name: 'Gadget B',
          capacity_type_name: 'Bag',
          weight_per_unit: 0.8,
        },
      ];

      mockedQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await getItemDefinitions();

      expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(result).toEqual(mockRows);
    });
  });
});
