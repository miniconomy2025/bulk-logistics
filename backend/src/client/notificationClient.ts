import { LogisticsNotification, LogisticsNotificationResponse } from "../types/notifications";
import { BaseApiClient } from "./baseClient";

class NotificationApiClient extends BaseApiClient {
    constructor() {
        super("", "NotificationService");
    }

    private readonly NotificationEndpoint = "/logistics";

    public async sendLogisticsNotification(notification: LogisticsNotification): Promise<LogisticsNotificationResponse> {
        try {
            console.log("Attempting to deliver", notification);
            return await this.client.post<LogisticsNotificationResponse>(`${notification.notificationURL}${this.NotificationEndpoint}`, {
                id: notification.id,
                type: notification.type,
                quantity: notification.quantity,
                items: notification.items,
            });
        } catch {
            return {
                status: 418,
            };
        }
    }
}

export const notificationApiClient = new NotificationApiClient();
