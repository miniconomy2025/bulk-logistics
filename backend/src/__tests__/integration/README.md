# Integration Testing with MSW

This directory contains integration tests that verify the interaction between multiple components of the bulk-logistics service, including HTTP calls to external services.

## What is MSW?

[MSW (Mock Service Worker)](https://mswjs.io/) intercepts HTTP requests at the network level and returns mock responses. This allows us to:

- ✅ Test real HTTP flows without running external services
- ✅ Avoid Docker or complex infrastructure setup
- ✅ Write fast, deterministic tests
- ✅ Test error scenarios easily

## Directory Structure

```
__tests__/integration/
├── README.md                          # This file
├── jest.integration.setup.ts          # MSW server setup for all integration tests
├── mocks/
│   ├── handlers.ts                    # Mock request handlers for external APIs
│   └── server.ts                      # MSW server configuration
├── pickup-request-flow.integration.test.ts
└── [other integration tests]
```

## Running Integration Tests

### Run all integration tests:
```bash
npm test -- integration
```

### Run a specific integration test file:
```bash
npm test -- pickup-request-flow.integration.test
```

### Run with coverage:
```bash
npm run test:coverage -- integration
```

### Watch mode:
```bash
npm run test:watch -- integration
```

## Writing Integration Tests

### Basic Structure

```typescript
import '../integration/jest.integration.setup'; // Import MSW setup
import { someClient } from '../../client/someClient';

// Mock only database layer, let HTTP calls go through MSW
jest.mock('../../models/someRepository');

describe('My Integration Test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup database mocks
    });

    it('should test integration flow', async () => {
        // Make real HTTP call (intercepted by MSW)
        const result = await someClient.fetchData();

        expect(result).toBeDefined();
    });
});
```

### Testing Different Scenarios

#### 1. Success Flow
```typescript
it('should handle successful API response', async () => {
    const result = await thohApiClient.getTrucksInformation();
    expect(result).toBeInstanceOf(Array);
});
```

#### 2. Error Scenarios
```typescript
import { server } from './mocks/server';
import { errorHandlers } from './mocks/handlers';

it('should handle API failure', async () => {
    // Override default handler with error handler
    server.use(errorHandlers.thohServiceUnavailable);

    await expect(thohApiClient.getTrucksInformation())
        .rejects
        .toThrow();
});
```

#### 3. Custom Responses
```typescript
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

it('should handle custom scenario', async () => {
    server.use(
        http.get('https://thoh-api.example.com/trucks', () => {
            return HttpResponse.json({ custom: 'response' });
        })
    );

    const result = await thohApiClient.getTrucksInformation();
    expect(result).toEqual({ custom: 'response' });
});
```

## Available Mock Handlers

### Commercial Bank API
- `GET /api/account/me` - Get account details
- `POST /api/account` - Create account
- `GET /api/account/me/balance` - Get balance
- `POST /api/loan` - Apply for loan
- `GET /api/loan/:loanNumber` - Get loan details
- `GET /api/loan` - Get all loans
- `POST /api/transaction` - Make payment

### THOH API
- `GET /api/time` - Get simulation time
- `GET /api/trucks` - Get truck information
- `POST /api/trucks` - Purchase trucks
- `GET /api/machines` - Get machine information

### Notification Endpoints
- `POST */logistics` - Generic logistics notifications
- `POST */notify` - Generic notifications

## Error Handlers

Pre-configured error scenarios are available in `handlers.ts`:

```typescript
import { errorHandlers } from './mocks/handlers';

// Use in tests
server.use(errorHandlers.bankServiceUnavailable);
server.use(errorHandlers.thohServiceUnavailable);
server.use(errorHandlers.paymentFailed);
server.use(errorHandlers.truckOutOfStock);
server.use(errorHandlers.notificationFailed);
```

## Best Practices

### 1. Mock Database, Test HTTP
```typescript
// ✅ Good - Mock database, let HTTP go through MSW
jest.mock('../../models/vehicleRepository');
const result = await thohApiClient.getTrucksInformation(); // Real HTTP

// ❌ Bad - Mocking both database and HTTP
jest.mock('../../models/vehicleRepository');
jest.mock('../../client/thohClient');
```

### 2. Reset Handlers Between Tests
```typescript
// Already done in jest.integration.setup.ts
afterEach(() => {
    server.resetHandlers(); // ✅ Ensures test isolation
});
```

### 3. Test Complete Flows
```typescript
it('should test end-to-end flow', async () => {
    // 1. Fetch data from external API
    const machinesInfo = await thohApiClient.getMachinesInformation();

    // 2. Use that data in business logic
    const cost = await calculateDeliveryCost(pickupRequest);

    // 3. Verify complete flow worked
    expect(cost).toBeGreaterThan(0);
});
```

### 4. Use Descriptive Test Names
```typescript
// ✅ Good
it('should fetch machine weights from THOH and calculate delivery cost')

// ❌ Bad
it('should work')
```

## Debugging Integration Tests

### View HTTP Calls
MSW logs unhandled requests by default. Check console output for:
```
[MSW] Warning: captured a request without a matching request handler
```

### Inspect Mock Responses
Add console logs in handlers:
```typescript
http.get('https://api.example.com/data', ({ request }) => {
    console.log('Intercepted request:', request.url);
    const response = { data: 'test' };
    console.log('Returning:', response);
    return HttpResponse.json(response);
})
```

### Test in Isolation
Run a single test to isolate issues:
```bash
npm test -- -t "specific test name"
```

## Common Issues and Solutions

### Issue: "Cannot find module 'msw'"
**Solution**: Run `npm install`

### Issue: Handlers not being called
**Solution**:
1. Check the URL in your handler matches exactly
2. Verify MSW server is started (`jest.integration.setup.ts` imported)
3. Check console for unhandled request warnings

### Issue: Database mock not working
**Solution**: Ensure you're mocking before importing the module that uses it:
```typescript
// ✅ Mock first
jest.mock('../../models/repository');
import { service } from '../../services/service'; // Then import
```

### Issue: Tests timing out
**Solution**:
1. Check if you have infinite loops in async code
2. Increase timeout: `jest.setTimeout(10000)`
3. Verify MSW handlers are responding

## Adding New Mock Handlers

To add a new external API endpoint:

1. Open `mocks/handlers.ts`
2. Add new handler:
```typescript
export const handlers = [
    // ... existing handlers

    http.get('https://new-api.example.com/endpoint', () => {
        return HttpResponse.json({
            data: 'response'
        });
    }),
];
```

3. Use in tests - it will be automatically available!

## Further Reading

- [MSW Documentation](https://mswjs.io/)
- [MSW Examples](https://mswjs.io/docs/basics/integration-testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
