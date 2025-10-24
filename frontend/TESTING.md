# Frontend Testing Guide

This document provides comprehensive information about the testing setup and strategies for the frontend application.

## Testing Framework

The frontend uses **Jest** as the primary testing framework with the following key dependencies:

- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM testing
- `@testing-library/user-event` - User interaction simulation
- `jest-environment-jsdom` - Browser-like environment for tests
- `ts-jest` - TypeScript support for Jest

## Test Structure

```
frontend/src/__tests__/
├── __mocks__/                 # Mock implementations
│   ├── components/            # Component mocks
│   ├── data/                 # Data service mocks
│   ├── layouts/              # Layout mocks
│   └── utils/                # Utility mocks
├── components/                # Component unit tests
│   └── ui/                   # UI component tests
├── data/                     # Data layer tests
├── layouts/                  # Layout tests
├── pages/                    # Page integration tests
├── utils/                    # Utility function tests
├── App.test.tsx              # App routing tests
└── setup.ts                  # Test setup configuration
```

## Test Categories

### 1. Unit Tests

- **Location**: `__tests__/utils/`, `__tests__/components/`, `__tests__/data/`
- **Purpose**: Test individual functions and components in isolation
- **Coverage**: Utility functions, UI components, data services

### 2. Integration Tests

- **Location**: `__tests__/pages/`
- **Purpose**: Test complete page components with their dependencies
- **Coverage**: Dashboard, PickupRequests, Shipments pages

### 3. UI Tests

- **Location**: `__tests__/App.test.tsx`, `__tests__/layouts/`
- **Purpose**: Test routing, layout components, and user interactions
- **Coverage**: App routing, layout components

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Specific Test Categories

```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only UI tests
npm run test:ui
```

### Advanced Commands

```bash
# Run tests for CI/CD
npm run test:ci

# Run tests with debug information
npm run test:debug

# Run tests with verbose output
npm run test:verbose

# Update test snapshots
npm run test:update-snapshots
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Test Environment**: jsdom (browser-like)
- **Coverage Thresholds**: 80% for all metrics
- **File Extensions**: .ts, .tsx, .js, .jsx
- **Setup Files**: `src/__tests__/setup.ts`
- **Module Mapping**: CSS and asset files are mocked

### Coverage Configuration

- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

## Mock Strategy

### Data Service Mocks

All external API calls are mocked to ensure tests run independently:

```typescript
// Example: Mock Transactions service
jest.mock("../../data/transactions", () => ({
    totals: jest.fn(),
    getAll: jest.fn(),
    // ... other methods
}));
```

### Component Mocks

Complex components are mocked to focus on the component under test:

```typescript
// Example: Mock chart component
jest.mock('../../components/income-expense-chart', () => {
  return function MockIncomeExpenseChart({ transaction }: any) {
    return <div data-testid="income-expense-chart">Chart with {transaction.length} data points</div>;
  };
});
```

### Utility Mocks

Utility functions are mocked when testing components that use them:

```typescript
// Example: Mock date formatting
jest.mock("../../utils/format-date", () => ({
    formatDate: jest.fn((date: string) => `Formatted: ${date}`),
}));
```

## Testing Best Practices

### 1. Test Naming

- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Use `it` for individual test cases

### 2. Test Structure (AAA Pattern)

```typescript
it('should do something specific', () => {
  // Arrange - Set up test data and mocks
  const mockData = { /* test data */ };

  // Act - Execute the function or render the component
  render(<Component data={mockData} />);

  // Assert - Verify the expected outcome
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### 3. Mock Management

- Clear mocks between tests using `beforeEach`
- Use `jest.clearAllMocks()` to reset mock call counts
- Provide realistic mock implementations

### 4. Async Testing

- Use `waitFor` for async operations
- Use `userEvent` for user interactions
- Handle loading states and error conditions

### 5. Coverage Goals

- Aim for 80%+ coverage across all metrics
- Focus on critical business logic
- Test edge cases and error conditions

## Test Data

### Mock Data Patterns

```typescript
// Consistent mock data structure
const mockTransactions = {
    page: 1,
    limit: 20,
    totalPages: 1,
    totalTransactions: 2,
    transactions: [
        {
            company: "Company A",
            amount: "1000",
            transaction_date: "2024-01-15",
            transaction_type: "PAYMENT_RECEIVED",
            pickup_request_id: 123,
        },
        // ... more transactions
    ],
};
```

## Common Test Patterns

### 1. Component Rendering

```typescript
it('should render with correct props', () => {
  render(<Component title="Test Title" value={100} />);
  expect(screen.getByText('Test Title')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
});
```

### 2. User Interactions

```typescript
it('should handle button clicks', async () => {
  const user = userEvent.setup();
  render(<Component />);

  const button = screen.getByRole('button');
  await user.click(button);

  expect(mockFunction).toHaveBeenCalled();
});
```

### 3. Async Operations

```typescript
it('should load data on mount', async () => {
  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

### 4. Error Handling

```typescript
it('should handle API errors gracefully', async () => {
  mockAPI.get.mockRejectedValue(new Error('API Error'));

  render(<Component />);

  await waitFor(() => {
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });
});
```

## Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor` for async operations
2. **Mock Setup**: Ensure mocks are properly configured
3. **Component Props**: Verify all required props are provided
4. **Test Environment**: Check that jsdom is properly configured

### Debug Commands

```bash
# Run specific test file
npm test -- ComponentName.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should render"

# Run tests with debug output
npm run test:debug
```

## Continuous Integration

### CI/CD Integration

The test suite is designed to run in CI/CD environments:

```bash
# CI command
npm run test:ci
```

This command:

- Runs all tests without watch mode
- Generates coverage reports
- Exits with appropriate status codes
- Works in headless environments

## Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output
- **HTML**: `coverage/index.html` (browser-viewable)
- **LCOV**: For CI/CD integration
- **JSON**: For programmatic access

## Maintenance

### Adding New Tests

1. Create test files following the naming convention: `*.test.tsx`
2. Place tests in the appropriate category directory
3. Follow the established patterns and structure
4. Update mocks if new dependencies are added

### Updating Tests

1. Update tests when components change
2. Maintain mock data consistency
3. Update coverage thresholds if needed
4. Review and update test documentation

## Troubleshooting

### Common Problems

1. **Import Errors**: Check module paths and extensions
2. **Mock Issues**: Verify mock implementations match real APIs
3. **Async Timeouts**: Increase timeout values if needed
4. **Coverage Issues**: Check file exclusions in Jest config

### Getting Help

- Check Jest documentation for advanced features
- Review Testing Library documentation for component testing
- Consult the project's test examples for patterns
- Use debug commands to isolate issues
