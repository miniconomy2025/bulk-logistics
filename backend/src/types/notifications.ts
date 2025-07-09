export interface Item {
    name: string;
    quantity: number;
}

export interface LogisticsNotification {
    id: number | string;
    notificationURL: string;
    type: "PICKUP" | "DELIVERY";
    items: Item[];
}

export interface LogisticNotificationsGrouped {
    pickups: LogisticsNotification[];
    dropoffs: LogisticsNotification[];
}

export interface LogisticsNotificationResponse {
    status: number;
}
