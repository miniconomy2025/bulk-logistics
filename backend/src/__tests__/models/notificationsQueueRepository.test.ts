import {
  getQueuedNotifications,
  addOrUpdateFailedNotification,
  removeSuccessfulNotification,
} from '../../models/notificationsQueueRepository';

import db from '../../config/database';
import { LogisticsNotification } from '../../types/notifications';

jest.mock('../../config/database');
const mockedQuery = db.query as jest.Mock;

describe('Notification Queue', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueuedNotifications', () => {
    it('should return list of queued notifications', async () => {
      const mockRows = [
        { id: 1, status: 'QUEUED', created_at: new Date() },
        { id: 2, status: 'QUEUED', created_at: new Date() },
      ];

      mockedQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await getQueuedNotifications();

      expect(mockedQuery).toHaveBeenCalledWith(
        `SELECT * FROM delivery_notification_queue WHERE status = 'QUEUED' ORDER BY created_at ASC;`
      );
      expect(result).toEqual(mockRows);
    });
  });

  describe('addOrUpdateFailedNotification', () => {
    it('should call db.query with the correct UPSERT query and parameters', async () => {
      const mockNotification: LogisticsNotification = {
        id: 'abc-123',
        notificationURL: 'https://example.com/notify',
        type: 'DELIVERY',
        quantity: 10,
        items: [
          { name: 'Widget', quantity: 5 },
          { name: 'Gadget', quantity: 5 },
        ],
      };

      const now = new Date();

      await addOrUpdateFailedNotification(mockNotification, now);

      expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('WITH updated AS'), [
        mockNotification.id,
        mockNotification,
        now,
      ]);
    });
  });

  describe('removeSuccessfulNotification', () => {
    it('should call db.query with the correct DELETE statement', async () => {
      const pickupRequestId = 456;

      await removeSuccessfulNotification(pickupRequestId);

      expect(mockedQuery).toHaveBeenCalledWith(
        `DELETE FROM delivery_notification_queue WHERE related_pickup_request_id = $1;`,
        [pickupRequestId]
      );
    });
  });
});
