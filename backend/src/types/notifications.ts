export interface Item {
    name: string;
    quantity: number;
}

export interface LogisticsNotification {
    id: number;
    notificationURL: string;
    type: "PICKUP" | "DELIVERY";
    items: Item[];
}

export interface LogisticsNotificationResponse {
    status: number;
}
