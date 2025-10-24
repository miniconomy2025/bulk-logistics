import React from "react";

interface MockPickupRequestsTableProps {
    requests: any[];
}

const MockPickupRequestsTable: React.FC<MockPickupRequestsTableProps> = ({ requests }) => {
    return (
        <div data-testid="pickup-requests-table">
            {requests.map((request: any, index: number) => (
                <div
                    key={index}
                    data-testid={`request-${index}`}
                >
                    {request.originCompanyName} → {request.destinationCompanyName}
                </div>
            ))}
        </div>
    );
};

export { MockPickupRequestsTable as PickupRequestsTable };
