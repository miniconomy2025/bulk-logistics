import nock from 'nock';

/**
 * Mock Setup for Integration Tests using nock
 *
 * This file contains helper functions to set up HTTP mocks for external services.
 * Using nock provides a simple, Jest-friendly way to mock HTTP requests without
 * the complexity of MSW's ESM modules.
 */

// Base URLs for external services
export const BANK_API_BASE = 'https://commercial-bank-api.subspace.site';
export const THOH_API_BASE = 'https://ec2-13-244-65-62.af-south-1.compute.amazonaws.com';

/**
 * Set up default mocks for Commercial Bank API
 */
export function setupBankMocks() {
    // Get account details
    nock(BANK_API_BASE)
        .persist()
        .get('/api/account/me')
        .reply(200, {
            success: true,
            account_number: 'TEST-BULK-LOGISTICS-123',
            net_balance: 500000,
            notification_url: 'https://team7-todo.xyz/api/bank'
        });

    // Create bank account
    nock(BANK_API_BASE)
        .persist()
        .post('/api/account')
        .reply(200, {
            account_number: 'TEST-BULK-LOGISTICS-123'
        });

    // Get account balance
    nock(BANK_API_BASE)
        .persist()
        .get('/api/account/me/balance')
        .reply(200, {
            balance: 500000
        });

    // Apply for loan
    nock(BANK_API_BASE)
        .persist()
        .post('/api/loan')
        .reply(200, (uri, requestBody: any) => ({
            success: true,
            loan_number: 'TEST-LOAN-12345'
        }));

    // Get loan details
    nock(BANK_API_BASE)
        .persist()
        .get(/\/api\/loan\/.*/)
        .reply(200, (uri) => {
            const loanNumber = uri.split('/').pop();
            return {
                success: true,
                loan_number: loanNumber,
                initial_amount: 100000,
                interest_rate: '0.05',
                started_at: '2025-01-15',
                write_off: false,
                outstanding_amount: '100000',
                payments: []
            };
        });

    // Get all loans
    nock(BANK_API_BASE)
        .persist()
        .get('/api/loan')
        .reply(200, {
            success: true,
            total_outstanding_amount: 0,
            loans: []
        });

    // Make payment
    nock(BANK_API_BASE)
        .persist()
        .post('/api/transaction')
        .reply(200, {
            success: true,
            transaction_number: `TEST-TXN-${Date.now()}`,
            status: 'completed'
        });
}

/**
 * Set up default mocks for THOH API
 */
export function setupThohMocks() {
    // Get simulation time
    nock(THOH_API_BASE)
        .persist()
        .get('/api/time')
        .reply(200, {
            error: null,
            epochStartTime: Date.now()
        });

    // Get trucks information
    nock(THOH_API_BASE)
        .persist()
        .get('/api/trucks')
        .reply(200, [
            {
                truckName: 'large_truck',
                price: 100000,
                operatingCost: 500,
                maximumLoad: 5000,
                description: 'Large capacity truck for heavy materials',
                quantity: 10,
                weight: 2000
            },
            {
                truckName: 'medium_truck',
                price: 50000,
                operatingCost: 300,
                maximumLoad: 2000,
                description: 'Medium capacity truck for moderate loads',
                quantity: 10,
                weight: 1500
            },
            {
                truckName: 'small_truck',
                price: 25000,
                operatingCost: 150,
                maximumLoad: 500,
                description: 'Small capacity truck for light loads',
                quantity: 10,
                weight: 800
            }
        ]);

    // Purchase truck
    nock(THOH_API_BASE)
        .persist()
        .post('/api/trucks')
        .reply(200, (uri, requestBody: any) => {
            const truckPrices: Record<string, number> = {
                'large_truck': 100000,
                'medium_truck': 50000,
                'small_truck': 25000
            };
            const truckLoads: Record<string, number> = {
                'large_truck': 5000,
                'medium_truck': 2000,
                'small_truck': 500
            };
            const operatingCosts: Record<string, number> = {
                'large_truck': 500,
                'medium_truck': 300,
                'small_truck': 150
            };

            return {
                orderId: Date.now(),
                truckName: requestBody.truckName,
                quantity: requestBody.quantity,
                totalPrice: truckPrices[requestBody.truckName] || 0,
                unitWeight: 2000,
                totalWeight: 2000 * requestBody.quantity,
                maximumLoad: truckLoads[requestBody.truckName] || 0,
                operatingCostPerDay: `${operatingCosts[requestBody.truckName]}/day`,
                bankAccount: 'TEST-THOH-ACCOUNT'
            };
        });

    // Get machines information
    nock(THOH_API_BASE)
        .persist()
        .get('/api/machines')
        .reply(200, {
            machines: [
                { name: 'screen_machine', weight: 2000 },
                { name: 'electronics_machine', weight: 2500 },
                { name: 'case_machine', weight: 1500 },
                { name: 'ephone_machine', weight: 2000 },
                { name: 'ephone_plus_machine', weight: 2200 },
                { name: 'ephone_pro_max_machine', weight: 2500 },
                { name: 'cosmos_z25_machine', weight: 2000 },
                { name: 'cosmos_z25_ultra_machine', weight: 2200 },
                { name: 'cosmos_z25_fe_machine', weight: 1800 },
                { name: 'recycling_machine', weight: 3000 }
            ]
        });
}

/**
 * Set up mocks for notification endpoints (company APIs)
 */
export function setupNotificationMocks() {
    // Generic logistics notification handler
    nock(/.*/)
        .persist()
        .post(/.*\/logistics/)
        .reply(200, {
            success: true,
            message: 'Notification received'
        });

    // Generic notify handler
    nock(/.*/)
        .persist()
        .post(/.*\/notify/)
        .reply(200, {
            success: true,
            message: 'Notification received'
        });
}

/**
 * Set up all default mocks for integration tests
 */
export function setupAllMocks() {
    setupBankMocks();
    setupThohMocks();
    setupNotificationMocks();
}

/**
 * Clean up all nock mocks
 */
export function cleanupMocks() {
    nock.cleanAll();
}
