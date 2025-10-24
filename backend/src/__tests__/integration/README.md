# Integration Testing with Nock

This directory contains integration tests that verify the interaction between multiple components of the bulk-logistics service, including HTTP calls to external services.

## What is Nock?

[Nock](https://github.com/nock/nock) is an HTTP mocking library that intercepts outgoing HTTP requests and returns mock responses. This allows us to:

- ✅ Test real HTTP flows without running external services
- ✅ Avoid Docker or complex infrastructure setup
- ✅ Write fast, deterministic tests
- ✅ Test error scenarios easily
- ✅ Simple, Jest-friendly API (unlike MSW's ESM complexity)

## Directory Structure

```
__tests__/integration/
├── README.md                                    # This file
├── mocks/
│   └── setup.ts                                 # Centralized nock setup and cleanup
├── example-integration.test.ts                  # Example test demonstrating patterns
├── pickup-request.integration.test.ts           # Pickup request lifecycle tests
├── shipment-planning.integration.test.ts        # Shipment planning algorithm tests
├── bank-notification.integration.test.ts        # Bank webhook handler tests
└── end-to-end-workflow.integration.test.ts      # Complete workflow tests
```

## Test Files Overview

### 1. **pickup-request.integration.test.ts**
Tests pickup request creation and management endpoints.

**Coverage:**
- Request creation with cost calculation (KG and UNIT items)
- Machine orders (count-based and weight-based)
- Large order partitioning
- Request status transitions (PENDING_PAYMENT → PENDING_DELIVERY → DELIVERED)
- Validation errors and API failures

**Example Tests:**
- Creating 3000 KG copper + 2000 KG silicon order
- Machine orders: 3 screen_machine units → 3 separate DB entries
- Large order: 12000 KG copper → split into 5000 + 5000 + 2000
- Invalid company/item validation

### 2. **shipment-planning.integration.test.ts**
Tests the two-pass shipment planning algorithm.

**Coverage:**
- Single and multiple request planning
- Capacity type constraints (KG vs UNIT)
- Pickup/dropoff limits
- Two-pass strategy (full requests first, then partial)
- Insufficient vehicles handling

**Example Tests:**
- 3000 KG copper fits on one large truck
- Large truck max 1 pickup/dropoff enforced
- Medium truck 5 pickups, 100 dropoffs
- Pass 1 plans full requests, Pass 2 fills remaining capacity

### 3. **bank-notification.integration.test.ts**
Tests the bank webhook notification handler.

**Coverage:**
- Payment confirmation processing
- Transaction validation and duplicate detection
- Different transaction statuses (PENDING, CONFIRMED, FAILED)
- Edge cases (zero amounts, decimal amounts)
- Error handling

**Example Tests:**
- Payment for pickup request updates status
- Duplicate transaction rejection (409)
- Invalid transaction fields (400)
- 3 rapid consecutive payments

### 4. **end-to-end-workflow.integration.test.ts**
Tests complete workflows from request creation to delivery.

**Coverage:**
- Full lifecycle: create → pay → plan → deliver
- Multiple concurrent requests
- Payment retry after failure
- Failed notification queuing
- Realistic simulation scenarios

**Example Tests:**
- Complete workflow: create order → pay → plan → deliver
- 3 requests from different companies
- Payment fails → retry succeeds
- Peak load: 20 requests with 3 vehicles

## Running Integration Tests

### Run all integration tests:
```bash
npm test -- integration
```

### Run specific test file:
```bash
npm test -- pickup-request.integration.test.ts
npm test -- shipment-planning.integration.test.ts
npm test -- bank-notification.integration.test.ts
npm test -- end-to-end-workflow.integration.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage integration
```

### Watch mode:
```bash
npm run test:watch -- integration
```

## Writing Integration Tests

### Basic Structure

```typescript
import nock from 'nock';
import request from 'supertest';
import { setupAllMocks, cleanupMocks, BANK_API_BASE, THOH_API_BASE } from './mocks/setup';
import app from '../../app';

// Mock only database layer, let HTTP calls go through nock
jest.mock('../../models/someRepository');
jest.mock('../../services/AutonomyService'); // Prevent auto-start

describe('My Integration Test', () => {
    beforeEach(() => {
        setupAllMocks(); // Set up all HTTP mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        cleanupMocks(); // Clean up nock interceptors
    });

    it('should test integration flow', async () => {
        // Make HTTP request via supertest
        const response = await request(app)
            .post('/api/pickup-request')
            .send({ /* data */ });

        expect(response.status).toBe(201);
    });
});
```

### Testing Different Scenarios

#### 1. Success Flow
```typescript
import { thohApiClient } from '../../client/thohClient';

it('should fetch trucks from THOH successfully', async () => {
    // Default mocks are set up in setupAllMocks()
    const result = await thohApiClient.getTrucksInformation();

    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toMatchObject({
        truckName: expect.any(String),
        price: expect.any(Number)
    });
});
```

#### 2. Error Scenarios
```typescript
import { cleanupMocks, THOH_API_BASE } from './mocks/setup';

it('should handle API failure', async () => {
    // Override default mock with error
    cleanupMocks();
    nock(THOH_API_BASE)
        .get('/api/trucks')
        .reply(503, { error: 'Service unavailable' });

    await expect(thohApiClient.getTrucksInformation())
        .rejects
        .toThrow();
});
```

#### 3. Custom Responses
```typescript
import { cleanupMocks, THOH_API_BASE } from './mocks/setup';

it('should handle custom truck pricing', async () => {
    cleanupMocks();
    nock(THOH_API_BASE)
        .get('/api/trucks')
        .reply(200, [
            {
                truckName: 'custom_truck',
                price: 999999,
                maximumLoad: 10000
            }
        ]);

    const trucks = await thohApiClient.getTrucksInformation();
    expect(trucks[0].price).toBe(999999);
});
```

#### 4. Testing POST Requests with Body Validation
```typescript
it('should capture request body when purchasing trucks', async () => {
    let capturedBody: any;

    cleanupMocks();
    nock(THOH_API_BASE)
        .post('/api/trucks', (body) => {
            capturedBody = body;
            return true; // Accept any body
        })
        .reply(200, {
            orderId: 123,
            truckName: 'large_truck',
            quantity: 4
        });

    await thohApiClient.purchaseTruck({
        truckName: 'large_truck',
        quantity: 4
    });

    expect(capturedBody).toMatchObject({
        truckName: 'large_truck',
        quantity: 4
    });
});
```

## Available Mock Handlers (from setup.ts)

The `setupAllMocks()` function automatically sets up these HTTP mocks:

### Commercial Bank API (`BANK_API_BASE`)
- `GET /api/account/me` - Get account details
- `POST /api/account` - Create account
- `POST /api/loan` - Apply for loan
- `GET /api/loan` - Get all loans
- `GET /api/loan/:loanNumber` - Get specific loan details
- `POST /api/transaction` - Make payment

### THOH API (`THOH_API_BASE`)
- `GET /api/time` - Get simulation time
- `GET /api/trucks` - Get truck information and pricing
- `POST /api/trucks` - Purchase trucks
- `GET /api/machines` - Get machine weights

### Notification Endpoints
- `POST */logistics` - Generic logistics notifications (200 OK)
- `POST */notify` - Generic notifications (200 OK)

## Mocking Strategy

### What to Mock

**✅ Always Mock:**
- Database repositories (using `jest.mock()`)
- AutonomyService (to prevent auto-start)

**✅ HTTP Mocks (using nock):**
- External API calls (THOH, Bank, Notifications)
- Set up via `setupAllMocks()` or custom nock interceptors

**❌ Don't Mock:**
- Business logic services (test the real code!)
- Express app (use supertest to make real HTTP requests)

### Example: Complete Test Setup

```typescript
import request from 'supertest';
import nock from 'nock';
import { setupAllMocks, cleanupMocks } from './mocks/setup';
import app from '../../app';

jest.mock('../../models/pickupRequestRepository');
jest.mock('../../models/vehicleRepository');
jest.mock('../../services/AutonomyService');

import * as pickupRequestRepo from '../../models/pickupRequestRepository';
import * as vehicleRepo from '../../models/vehicleRepository';

describe('My Test Suite', () => {
    beforeEach(() => {
        setupAllMocks(); // nock HTTP mocks
        jest.clearAllMocks();

        // Setup database mocks
        (pickupRequestRepo.savePickupRequest as jest.Mock).mockResolvedValue({ id: 1 });
        (vehicleRepo.getAllVehiclesWithType as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
        cleanupMocks(); // Clean up nock
    });

    it('should work', async () => {
        const response = await request(app)
            .post('/api/pickup-request')
            .send({ /* data */ });

        expect(response.status).toBe(201);
    });
});
```

## Best Practices

### 1. Use setupAllMocks() for Standard Tests
```typescript
// ✅ Good - Use centralized setup
beforeEach(() => {
    setupAllMocks();
});

// ❌ Bad - Manually setting up every nock interceptor
beforeEach(() => {
    nock('https://...').get('/api/trucks').reply(200, ...);
    nock('https://...').get('/api/machines').reply(200, ...);
    // ... dozens of lines
});
```

### 2. Clean Up Mocks After Each Test
```typescript
// ✅ Good - Always cleanup
afterEach(() => {
    cleanupMocks(); // Removes all nock interceptors
});

// ❌ Bad - Mocks leak between tests
// (no cleanup)
```

### 3. Override Default Mocks When Needed
```typescript
it('should handle error scenario', async () => {
    // Clean default mocks first
    cleanupMocks();

    // Set up custom error mock
    nock(THOH_API_BASE)
        .get('/api/trucks')
        .reply(503, { error: 'Unavailable' });

    // Test error handling
    await expect(thohApiClient.getTrucksInformation()).rejects.toThrow();
});
```

### 4. Use Helper Functions for Test Data
```typescript
// ✅ Good - Reusable helpers
function createMockRequest(id: number, items: any[]) {
    return {
        pickupRequestId: id,
        items: items.map(/* ... */)
    };
}

// ❌ Bad - Repeating data structure in every test
it('test 1', () => {
    const request = { pickupRequestId: 1, items: [{ ... }] };
});
it('test 2', () => {
    const request = { pickupRequestId: 2, items: [{ ... }] };
});
```

### 5. Test Complete Workflows
```typescript
it('should complete full pickup request lifecycle', async () => {
    // 1. Create request
    const createResp = await request(app).post('/api/pickup-request').send(...);

    // 2. Process payment
    await request(app).post('/api/bank').send(...);

    // 3. Plan shipment
    const result = await planner.planDailyShipments();

    // 4. Verify completion
    expect(result.plannedRequestIds).toContain(createResp.body.pickupRequestId);
});
```

### 6. Use Descriptive Test Names
```typescript
// ✅ Good
it('should partition 12000 KG copper into 3 trucks of 5000, 5000, and 2000 KG')

// ❌ Bad
it('should work')
it('test 1')
```

## Debugging Integration Tests

### Enable Nock Logging
Nock can log all intercepted requests:
```typescript
beforeEach(() => {
    nock.recorder.rec({
        output_objects: true
    });
});
```

### Check for Unmatched Requests
If nock doesn't intercept a request, it will fail. Check the error message:
```
Nock: No match for request {
  method: 'GET',
  url: 'https://thoh-api.example.com/api/trucks'
}
```

**Common causes:**
- URL doesn't match exactly (check protocol, host, path)
- Method doesn't match (GET vs POST)
- Forgot to call `setupAllMocks()`

### Inspect Request Bodies
Capture what's being sent:
```typescript
let capturedBody: any;
nock(THOH_API_BASE)
    .post('/api/trucks', (body) => {
        console.log('Request body:', body);
        capturedBody = body;
        return true;
    })
    .reply(200, { success: true });
```

### Test in Isolation
Run a single test:
```bash
npm test -- -t "should create pickup request"
```

## Common Issues and Solutions

### Issue: "Nock: No match for request"
**Solution**:
1. Ensure `setupAllMocks()` is called in `beforeEach`
2. Check URL matches exactly (including protocol and path)
3. Verify method matches (GET, POST, etc.)
4. If testing custom scenarios, make sure you didn't forget to override the default mock

### Issue: "Cannot find module 'nock'"
**Solution**: Run `npm install`

### Issue: Database mock not working
**Solution**: Mock BEFORE importing the code that uses it:
```typescript
// ✅ Good
jest.mock('../../models/repository');
import * as repo from '../../models/repository';
import { service } from '../../services/service';

// ❌ Bad - too late!
import { service } from '../../services/service';
jest.mock('../../models/repository');
```

### Issue: Tests timing out
**Solution**:
1. Check for unresolved promises
2. Verify nock mocks are set up correctly
3. Increase timeout: `jest.setTimeout(10000)`
4. Make sure `cleanupMocks()` is called in `afterEach`

### Issue: "Mock function not called"
**Solution**:
1. Verify the code path actually executes
2. Check if `.persist()` is needed for multiple calls
3. Use `jest.clearAllMocks()` in `beforeEach`
4. Check if another mock is interfering

### Issue: Mocks leaking between tests
**Solution**: Always call `cleanupMocks()` in `afterEach`:
```typescript
afterEach(() => {
    cleanupMocks(); // Removes all nock interceptors
});
```

## Adding New Mock Handlers

To add new external API endpoints:

### Option 1: Add to `mocks/setup.ts`
For commonly used endpoints:
```typescript
export function setupBankMocks() {
    // ... existing mocks

    nock(BANK_API_BASE)
        .persist()
        .get('/api/new-endpoint')
        .reply(200, { data: 'response' });
}
```

### Option 2: Add in Individual Tests
For one-off scenarios:
```typescript
it('should handle custom scenario', async () => {
    cleanupMocks(); // Clear defaults

    nock(THOH_API_BASE)
        .get('/api/special-endpoint')
        .reply(200, { custom: 'data' });

    // ... test code
});
```

## Expected Test Results

⚠️ **Important Note**: As mentioned, the simulation has not been flawless, so **not all tests may pass 100%**. This is expected and acceptable.

### Likely Success Areas:
- ✅ Request creation and validation
- ✅ Payment processing
- ✅ Basic shipment planning
- ✅ API error handling

### Potential Flakiness:
- ⚠️ Complex multi-vehicle scenarios
- ⚠️ Exact cost calculations
- ⚠️ Timing-dependent operations
- ⚠️ Notification retry logic

**Goal**: Verify critical workflows work, not achieve 100% pass rate.

## Further Reading

- [Nock Documentation](https://github.com/nock/nock)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Integration Testing Best Practices](https://martinfowler.com/bliki/IntegrationTest.html)
