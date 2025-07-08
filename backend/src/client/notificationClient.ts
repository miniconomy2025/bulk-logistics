import { LogisticsNotification, LogisticsNotificationResponse } from '../types/notifications';
import { BaseApiClient } from './baseClient';

class NotificationApiClient extends BaseApiClient {

    constructor() {
        super('', 'NotificationService');
    }

    private readonly NotificationEndpoint = '/logistics';
  
    public async sendLogisticsNotification(notification: LogisticsNotification): Promise<LogisticsNotificationResponse> {
        return await this.client.post<LogisticsNotificationResponse>(`${notification.notificationURL}${this.NotificationEndpoint}`, notification);
    }
}

// Export a single instance so the rest of your app reuses the same client.
export const notificationApiClient = new NotificationApiClient();
