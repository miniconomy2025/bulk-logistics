export const ShipmentStatus = {
    Pending: "PENDING",
    PickedUp: "PICKED_UP",
    Delivered: "DELIVERED",
};

export const VehicleType = {
    Large: "LARGE",
    Medium: "MEDIUM",
    Small: "SMALL",
};

export const MeasurementType = {
    Weight: "KG",
    Unit: "UNIT",
};

export const TransactionCategory = {
    Loan: "LOAN",
    Purchase: "PURCHASE",
    Expense: "EXPENSE",
    PaymentReceived: "PAYMENT_RECEIVED",
};

export const PickupRequestCompletionStatus = {
    PendingDelivery: "PENDING_DELIVERY",
    PendingPayment: "PENDING_PAYMENT",
    Delivered: "DELIVERED",
};

// To be defined with more detail. We don't know what to expect from them.
export const ThohEvents = {
    StartSimulation: "START_SIMULATION",
    EndSimulation: "END_SIMULATION",
    ResetSimulation: "RESET_SIMULATION",
    VehicleCrash: "VEHICLE_CRASH",
    Config: "CONFIG"
}
