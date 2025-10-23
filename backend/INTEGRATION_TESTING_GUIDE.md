# Integration Testing Guide for Bulk-Logistics

## Overview

This guide documents the integration testing setup for the bulk-logistics backend. Integration tests verify the interaction between multiple components and external service calls.

## ✅ Completed Setup

### 1. Testing Infrastructure Installed
- **nock** (v14.0.0+) - HTTP mocking library that works seamlessly with Jest
- **supertest** (already installed) - HTTP assertion library for testing Express APIs

### 2. Created Files

#### Test Infrastructure
- `backend/src/__tests__/integration/mocks/setup.ts` - Nock-based HTTP mocking setup
- `backend/src/__tests__/integration/pickup-request-flow.integration.test.ts` - Example integration test
- `backend/src/__tests__/api/simulation-status.api.test.ts` - API endpoint test

#### Documentation
- `backend/src/__tests__/integration/README.md` - Comprehensive testing documentation

### 3. Middleware Implementation (COMPLETED ✅)
Created simulation status middleware that blocks pickup requests when simulation is not running:
- `backend/src/utils/simulationStatusMiddleware.ts` - Middleware implementation
- `backend/src/services/AutonomyService.ts` - Added `getIsRunning()` public method
- `backend/src/routes/pickupRequestRoutes.ts` - Applied middleware to POST route

## Testing Approach: Nock vs MSW

### Why Nock?

After attempting to use MSW (Mock Service Worker), we encountered ESM module compatibility issues with Jest. **Nock is the recommended approach** because:

✅ **Pros:**
- Zero configuration issues with Jest
- Simple, straightforward API
- Works immediately with TypeScript
- No ESM/CommonJS conflicts
- Lightweight and fast
- Perfect for Node.js testing

❌ **MSW Issues:**
- ESM module compatibility problems with Jest
- Requires complex Babel/Jest configuration
- `until-async` dependency causes parse errors
- Better suited for browser testing

## Quick Start with Nock

### Running Tests

```bash
# Run all tests
npm test

# Run only integration tests
npm test -- integration

# Run only API tests
npm test -- api

# Run specific test file
npm test -- pickup-request-flow

# Run with coverage
npm run test:coverage
```

### Writing Integration Tests with Nock

#### Example: Testing External API Calls

```typescript
import nock from 'nock';
import { thohApiClient } from '../../client/thohClient';

describe('THOH API Integration', () => {
    beforeEach(() => {
        // Set up HTTP mock
        nock('https://ec2-13-244-65-62.af-south-1.compute.amazonaws.com')
            .get('/api/trucks')
            .reply(200, [
                {
                    truckName: 'large_truck',
                    price: 100000,
                    maximumLoad: 5000
                }
            ]);
    });

    afterEach(() => {
        nock.cleanAll(); // Clean up mocks
    });

    it('should fetch truck information', async () => {
        const trucks = await thohApiClient.getTrucksInformation();

        expect(trucks).toBeInstanceOf(Array);
        expect(trucks[0].truckName).toBe('large_truck');
    });
});
```

#### Using Pre-configured Mocks

```typescript
import { setupAllMocks, cleanupMocks } from './mocks/setup';
import { bankApiClient } from '../../client/bankClient';

describe('Bank Integration', () => {
    beforeEach(() => {
        setupAllMocks(); // Sets up all external service mocks
    });

    afterEach(() => {
        cleanupMocks(); // Clean up
    });

    it('should create bank account', async () => {
        const result = await bankApiClient.createAccount('https://example.com/notify');
        expect(result.account_number).toBeDefined();
    });
});
```

## Testing Patterns

### Pattern 1: Integration Tests (External API + Business Logic)

**Purpose**: Test real HTTP flows with mocked external services

```typescript
// Mock database layer, test HTTP + business logic
jest.mock('../../models/vehicleRepository');
import { calculateDeliveryCost } from '../../services/DeliveryCostCalculatorService';

describe('Cost Calculation Integration', () => {
    beforeEach(() => {
        // Setup nock mocks for THOH API
        nock('https://thoh-api.example.com')
            .get('/api/trucks')
            .reply(200, [...trucks]);

        // Mock database responses
        (getAllVehiclesWithType as jest.Mock).mockResolvedValue([...vehicles]);
    });

    it('should calculate cost using real HTTP call to THOH', async () => {
        const cost = await calculateDeliveryCost(pickupRequest);
        expect(cost).toBeGreaterThan(0);
    });
});
```

### Pattern 2: API Endpoint Tests (Supertest)

**Purpose**: Test your Express routes and middleware

```typescript
import request from 'supertest';
import app from '../../app';

describe('Pickup Request API', () => {
    it('should block requests when simulation not running', async () => {
        const response = await request(app)
            .post('/api/pickup-request')
            .send({ ...pickupData });

        expect(response.status).toBe(503);
        expect(response.body.error).toBe('Service Unavailable');
    });
});
```

### Pattern 3: Error Scenario Testing

```typescript
it('should handle THOH API failure', async () => {
    // Override default mock with error response
    nock.cleanAll();
    nock('https://thoh-api.example.com')
        .get('/api/trucks')
        .reply(503, { error: 'Service unavailable' });

    await expect(thohApiClient.getTrucksInformation())
        .rejects
        .toThrow();
});
```

## Available Mock Setups

The `mocks/setup.ts` file provides pre-configured mocks:

### setupBankMocks()
- GET `/api/account/me` - Account details
- POST `/api/account` - Create account
- GET `/api/account/me/balance` - Get balance
- POST `/api/loan` - Apply for loan
- GET `/api/loan/:loanNumber` - Get loan details
- GET `/api/loan` - Get all loans
- POST `/api/transaction` - Make payment

### setupThohMocks()
- GET `/api/time` - Simulation time
- GET `/api/trucks` - Truck information
- POST `/api/trucks` - Purchase trucks
- GET `/api/machines` - Machine information

### setupNotificationMocks()
- POST `*/logistics` - Generic logistics notifications
- POST `*/notify` - Generic notifications

### setupAllMocks()
Convenience function that sets up all of the above.

## Test File Organization

```
backend/src/__tests__/
├── unit/                           # Unit tests (existing)
│   ├── client/
│   ├── services/
│   └── models/
├── integration/                    # NEW - Integration tests
│   ├── mocks/
│   │   └── setup.ts               # Nock mock configurations
│   ├── pickup-request-flow.integration.test.ts
│   ├── bank-payment-flow.integration.test.ts (TODO)
│   └── shipment-planning-flow.integration.test.ts (TODO)
└── api/                            # NEW - API endpoint tests
    ├── simulation-status.api.test.ts
    ├── pickup-request-api.test.ts (TODO)
    └── thoh-webhook-api.test.ts (TODO)
```

## Common Patterns

### 1. Mock Database, Test HTTP

```typescript
// ✅ Good - Tests real HTTP flow with mocked DB
jest.mock('../../models/repository');
nock('https://external-api.com').get('/data').reply(200, {...});
const result = await clientService.fetchAndProcess();
```

### 2. Test Complete Flows

```typescript
it('should handle end-to-end pickup request flow', async () => {
    // 1. Fetch machine weights (real HTTP via nock)
    const machines = await thohApiClient.getMachinesInformation();

    // 2. Calculate cost using fetched data
    const cost = await calculateDeliveryCost(request);

    // 3. Verify complete flow
    expect(cost).toBeGreaterThan(0);
});
```

### 3. Clean Up Between Tests

```typescript
afterEach(() => {
    nock.cleanAll(); // ✅ Always clean up mocks
    jest.clearAllMocks(); // ✅ Clear Jest mocks
});
```

## Debugging Tips

### View Nock Activity

```typescript
// Enable nock logging
nock.recorder.rec({
    output_objects: true
});

// Your test code...

// Log recorded calls
console.log(nock.recorder.play());
```

### Check for Unmatched Requests

```typescript
afterEach(() => {
    // This will throw if there are unmatched HTTP requests
    expect(nock.isDone()).toBe(true);
});
```

### Inspect Nock Mocks

```typescript
beforeEach(() => {
    nock('https://api.example.com')
        .get('/data')
        .reply(200, (uri, requestBody) => {
            console.log('Intercepted request:', uri);
            console.log('Request body:', requestBody);
            return { data: 'response' };
        });
});
```

## Next Steps

### Recommended Tests to Add

1. **Bank Payment Flow Integration Test**
   - Receive webhook → Update ledger → Process shipment

2. **Shipment Planning Flow Integration Test**
   - Plan shipments → Send notifications → Handle responses

3. **THOH Event Flow Integration Test**
   - Receive START_SIMULATION → Initialize → Purchase trucks

4. **Pickup Request API Tests**
   - Test validation, cost calculation, database storage
   - Test error scenarios

5. **Webhook Endpoint Tests**
   - Test bank payment webhooks
   - Test THOH event webhooks

### Performance Testing (Future)

For load testing and performance validation:
- Use **Artillery** or **k6** for load testing
- Use **Clinic.js** for Node.js performance profiling
- Run integration tests with `--runInBand` for sequential execution

## Troubleshooting

### Issue: "nock: No match for request"

**Solution**: Check your nock setup matches the exact URL:
```typescript
// ❌ Wrong
nock('https://api.example.com/api').get('/data')

// ✅ Correct
nock('https://api.example.com').get('/api/data')
```

### Issue: Tests passing but no HTTP calls made

**Solution**: Ensure you're not mocking the client itself:
```typescript
// ❌ Don't do this in integration tests
jest.mock('../../client/thohClient');

// ✅ Do this - mock DB, let HTTP go through nock
jest.mock('../../models/repository');
```

### Issue: Persistent mocks affecting other tests

**Solution**: Always clean up in `afterEach`:
```typescript
afterEach(() => {
    nock.cleanAll(); // ✅ Essential for test isolation
});
```

## Example Test: Complete Integration Flow

```typescript
import nock from 'nock';
import { setupAllMocks, cleanupMocks } from './mocks/setup';
import { calculateDeliveryCost } from '../../services/DeliveryCostCalculatorService';
import { thohApiClient } from '../../client/thohClient';

describe('Complete Pickup Request Flow', () => {
    beforeEach(() => {
        setupAllMocks();
        jest.mock('../../models/vehicleRepository');
        (getAllVehiclesWithType as jest.Mock).mockResolvedValue([...vehicles]);
    });

    afterEach(() => {
        cleanupMocks();
        jest.clearAllMocks();
    });

    it('should fetch machine weights and calculate cost', async () => {
        // Step 1: Fetch machine data from THOH (via nock)
        const machinesInfo = await thohApiClient.getMachinesInformation();
        expect(machinesInfo.machines).toHaveLength(10);

        // Step 2: Create pickup request
        const pickupRequest = {
            originCompany: 'thoh',
            destinationCompany: 'screen-supplier',
            items: [{ itemName: 'screen_machine', quantity: 2000, measurementType: 'KG' }]
        };

        // Step 3: Calculate cost (uses fetched machine data)
        const cost = await calculateDeliveryCost(pickupRequest);

        // Step 4: Verify the complete flow
        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeLessThan(1000); // Reasonable cost
    });
});
```

## Conclusion

The integration testing setup provides:
- ✅ Easy-to-use HTTP mocking with nock
- ✅ Real HTTP flow testing without external dependencies
- ✅ Fast test execution
- ✅ No Docker or complex infrastructure needed
- ✅ Works seamlessly with existing Jest setup
- ✅ Full TypeScript support

Start by running the example tests, then add more tests following the patterns documented here.

## Resources

- [Nock Documentation](https://github.com/nock/nock)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Integration Testing Best Practices](https://kentcdodds.com/blog/write-tests)
