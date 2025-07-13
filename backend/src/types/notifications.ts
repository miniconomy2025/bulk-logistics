export interface Item {
    name: string;
    quantity: number;
}

export interface LogisticsNotification {
    id: number | string;
    notificationURL: string;
    type: "PICKUP" | "DELIVERY";
    quantity: number;
    items: Item[];
}

export interface LogisticNotificationsGrouped {
    pickups: LogisticsNotification[];
    dropoffs: LogisticsNotification[];
}

export interface LogisticsNotificationResponse {
    status: number;
}

export interface QueuedNotification {
    notification_id: number;
    related_pickup_request_id: number;
    payload: LogisticsNotification;
    retry_count: number;
}
