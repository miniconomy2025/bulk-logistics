import { LogisticsNotification, LogisticsNotificationResponse } from "../types/notifications";
import { BaseApiClient } from "./baseClient";

class NotificationApiClient extends BaseApiClient {
    constructor() {
        super("", "NotificationService");
    }

    private readonly NotificationEndpoint = "/logistics";

    public async sendLogisticsNotification(notification: LogisticsNotification): Promise<LogisticsNotificationResponse>{
        
      try {
        return await this.client.post<LogisticsNotificationResponse>(`${notification.notificationURL}${this.NotificationEndpoint}`, {
          id: notification.id,
          type: notification.type,
          items: notification.items,
        });
      } catch{
        return {
          status: 418,
        }
        //Ignore Error
      }
    }
}
// Export a single instance so the rest of your app reuses the same client.
export const notificationApiClient = new NotificationApiClient();
