import React from "react";

interface MockShipmentTableProps {
    shipments: any[];
}

const MockShipmentTable: React.FC<MockShipmentTableProps> = ({ shipments }) => {
    return (
        <div data-testid="shipment-table">
            {shipments.map((shipment: any, index: number) => (
                <div
                    key={index}
                    data-testid={`shipment-${index}`}
                >
                    {shipment.vehicle} - {shipment.status.statusName}
                </div>
            ))}
        </div>
    );
};

export { MockShipmentTable as ShipmentTable };
