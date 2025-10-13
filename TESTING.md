# Testing Setup Guide

This project now includes Jest testing framework for both backend and frontend components.

## Overview

- **Backend**: Jest with TypeScript support, Supertest for API testing
- **Frontend**: Jest with React Testing Library for component testing

## Installation

Install dependencies for both backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Or install all at once from root
npm install
```

## Running Tests

### From Root Directory

```bash
# Run all tests (backend + frontend)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only backend tests
npm run test:backend

# Run only frontend tests
npm run test:frontend
```

### From Individual Directories

#### Backend Tests
```bash
cd backend
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

#### Frontend Tests
```bash
cd frontend
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## Test Structure

### Backend Tests
- Location: `backend/src/__tests__/`
- Configuration: `backend/jest.config.js`
- Setup: `backend/src/__tests__/setup.ts`

### Frontend Tests
- Location: `frontend/src/__tests__/`
- Configuration: `frontend/jest.config.js`
- Setup: `frontend/src/__tests__/setup.ts`

## Sample Tests Included

### Frontend
1. **format-currency.test.ts** - Tests currency formatting utility

## Writing New Tests

### Backend Test Example
```typescript
// backend/src/__tests__/services/MyService.test.ts
import { myFunction } from '../../services/MyService';

describe('MyService', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Frontend Test Example
```typescript
// frontend/src/__tests__/components/MyComponent.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Configuration Details

### Backend Jest Configuration
- Uses `ts-jest` preset for TypeScript support
- Test environment: Node.js
- Includes setup file for global configuration
- Excludes main app file from coverage

### Frontend Jest Configuration
- Uses `ts-jest` preset for TypeScript support
- Test environment: jsdom (simulated browser)
- Includes React Testing Library setup
- Handles CSS and asset imports

## Coverage Reports

Coverage reports are generated in the `coverage/` directory for each project:
- `backend/coverage/` - Backend coverage report
- `frontend/coverage/` - Frontend coverage report

Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Mocking**: Mock external dependencies to isolate unit tests
4. **Coverage**: Aim for meaningful coverage, not just high percentages
5. **Test Organization**: Group related tests using `describe` blocks

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure all dependencies are installed
2. **TypeScript errors**: Check that test files are included in TypeScript configuration
3. **Import errors**: Verify import paths are correct relative to test file location

### Debug Mode
Run tests with verbose output:
```bash
npm test -- --verbose
```

### Watch Mode Issues
If watch mode doesn't work properly, try:
```bash
npm run test:watch -- --no-cache
```
