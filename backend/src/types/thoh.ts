export interface ThohEvent {
    type: string;
    message: string;
    data?: any;
}

export interface TruckFailureInfo {
  truckName: string,
  failureQuantity: number,
  simulationDate: string,
  simulationTime: string,
}

export interface TruckPurchaseRequest {
    truckName: string;
    quantity: number;
}

export interface TruckPurchaseResponse {
    orderId: number;
    truckName: string;
    price: number;
    maximumLoad: number;
    operatingCostPerDay: string;
    weight: number;
    totalWeight: number;
    quantity: number;
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
