export interface TruckFailureInfo {
    truckName: string;
    failureQuantity: number;
    simulationDate: string;
    simulationTime: string;
}

export interface TruckPurchaseRequest {
    truckName: string;
    quantity: number;
}

export interface TimeResponse {
    epochStartTime?: number;
    error?: string;
}

export interface TruckPurchaseResponse {
    orderId: number;
    truckName: "large_truck" | "medium_truck";
    totalPrice: number;
    unitWeight: number;
    totalWeight: number;
    quantity: number;
    maximumLoad: number;
    operatingCostPerDay: string;
    bankAccount: string;
}

export interface TruckInfoResponse {
    truckName: string;
    description: string;
    price: number;
    quantity: number;
    operatingCost: number;
    maximumLoad: number;
    weight: number;
}

export interface TruckFailureRequest {
    truckName: string;
    failureQuantity: number;
    simulationDate: string;
    simulationTime: string;
}

export interface TruckDeliveryRequest {
    orderId: number;
    itemName: string;
    quantity: number;
    totalPrice: number;
    status: string;
    message: string;
    canFulfill: boolean;
    maximumLoad: number;
    operationalCostPerDay: number;
}
