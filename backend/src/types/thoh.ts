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

export interface MachinesInformationResponse {
    machines: MachinesInformation[];
}

export interface MachinesInformation {
    machineName: string;
    inputs: string;
    quantity: number;
    inputRatio: MachineInputRatio;
    productionRate: number;
    price: number;
    weight: number;
}

export interface MachineInputRatio {
    copper?: number;
    plastic?: number;
    aluminium?: number;
    sand?: number;
    silicon?: number;
    cases?: number;
    screens?: number;
    electronics?: number;
    any_phone?: number;
}
