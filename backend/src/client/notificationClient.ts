import { LogisticsNotification, LogisticsNotificationResponse } from "../types/notifications";
import AppError from "../utils/errorHandlingMiddleware/appError";
import { BaseApiClient } from "./baseClient";

class NotificationApiClient extends BaseApiClient {
    constructor() {
        super("", "NotificationService");
    }

    private readonly NotificationEndpoint = "/logistics";

    public async sendLogisticsNotification(notification: LogisticsNotification): Promise<LogisticsNotificationResponse> {
        try {
            // Validate notification URL
            if (!notification.notificationURL || notification.notificationURL.trim() === '') {
                throw new Error("Notification URL is required");
            }

            // Validate URL format
            try {
                new URL(notification.notificationURL);
            } catch {
                throw new Error(`Invalid notification URL format: ${notification.notificationURL}`);
            }

            // Validate quantity
            if (notification.quantity < 0) {
                throw new Error("Notification quantity cannot be negative");
            }

            // Validate items
            if (!notification.items || notification.items.length === 0) {
                console.warn("Notification has no items, but quantity is", notification.quantity);
            }

            console.log("Attempting to deliver or pickup", notification);

            // Fixed: Handle trailing slashes properly
            const baseUrl = notification.notificationURL.replace(/\/$/, '');
            const fullUrl = `${baseUrl}${this.NotificationEndpoint}`;

            return await this.client.post<LogisticsNotificationResponse>(fullUrl, {
                id: notification.id,
                type: notification.type,
                quantity: notification.quantity,
                items: notification.items,
            });
        } catch (error: any) {
            // Fixed: Log errors and throw AppError instead of silently returning 418
            console.error("Failed to send logistics notification:", error.message || error);
            console.error("Notification details:", {
                id: notification.id,
                url: notification.notificationURL,
                type: notification.type,
            });
            throw new AppError(error, 502);
        }
    }
}

export const notificationApiClient = new NotificationApiClient();
