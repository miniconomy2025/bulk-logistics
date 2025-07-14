import db from "../config/database";
import { LogisticsNotification, QueuedNotification } from "../types/notifications";

export const getQueuedNotifications = async (): Promise<QueuedNotification[]> => {
    const query = `SELECT * FROM delivery_notification_queue WHERE status = 'QUEUED' ORDER BY created_at ASC;`;
    const result = await db.query(query);
    return result.rows;
};

export const addOrUpdateFailedNotification = async (notification: LogisticsNotification, currentDate: Date): Promise<void> => {
    const query = `
        WITH updated AS (
            UPDATE delivery_notification_queue
            SET 
                retry_count = retry_count + 1,
                last_attempt_at = $3
            WHERE
                related_pickup_request_id = $1 AND status = 'QUEUED'
            RETURNING *
        )
        INSERT INTO delivery_notification_queue (related_pickup_request_id, payload, last_attempt_at, created_at)
        SELECT $1, $2, $3, $3
        WHERE NOT EXISTS (SELECT 1 FROM updated);
    `;
    await db.query(query, [notification.id, notification, currentDate]);
};

export const removeSuccessfulNotification = async (pickupRequestId: number): Promise<void> => {
    const query = `DELETE FROM delivery_notification_queue WHERE related_pickup_request_id = $1;`;
    await db.query(query, [pickupRequestId]);
};
