import { validatePickupRequest } from '../../validation/pickupRequestValidator';
import { PickupRequestRequest } from '../../types/PickupRequest';

// Mock the company repository
jest.mock('../../models/companyRepository', () => ({
  getCompanyByName: jest.fn(),
}));

describe('pickupRequestValidator', () => {
  const mockGetCompanyByName = require('../../models/companyRepository').getCompanyByName;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate successfully with valid companies and items', async () => {
    // Mock successful company lookups
    mockGetCompanyByName.mockResolvedValueOnce({ id: 1, name: 'Company A' });
    mockGetCompanyByName.mockResolvedValueOnce({ id: 2, name: 'Company B' });

    const validPickupRequest: PickupRequestRequest = {
      originalExternalOrderId: '1234567890',
      originCompany: 'Company A',
      destinationCompany: 'Company B',
      items: [
        { itemName: 'copper', quantity: 10, measurementType: 'KG' },
        { itemName: 'silicon', quantity: 5, measurementType: 'KG' }
      ]
    };

    // Should not throw an error
    await expect(validatePickupRequest(validPickupRequest)).resolves.toBeUndefined();
  });

  it('should throw error when destination company is invalid', async () => {
    // Mock invalid destination company
    mockGetCompanyByName.mockResolvedValueOnce({ id: 1, name: 'Company A' });
    mockGetCompanyByName.mockResolvedValueOnce(null);

    const invalidPickupRequest: PickupRequestRequest = {
      originalExternalOrderId: '1234567890',
      originCompany: 'Company A',
      destinationCompany: 'Invalid Company',
      items: [{ itemName: 'copper', quantity: 10, measurementType: 'KG' }]
    };

    await expect(validatePickupRequest(invalidPickupRequest))
      .rejects.toThrow('Either the destination or the origin company is invalid.');
  });

  it('should throw error when origin company is invalid', async () => {
    // Mock invalid origin company
    mockGetCompanyByName.mockResolvedValueOnce(null);
    mockGetCompanyByName.mockResolvedValueOnce({ id: 2, name: 'Company B' });

    const invalidPickupRequest: PickupRequestRequest = {
      originalExternalOrderId: '1234567890',
      originCompany: 'Invalid Company',
      destinationCompany: 'Company B',
      items: [{ itemName: 'copper', quantity: 10, measurementType: 'KG' }]
    };

    await expect(validatePickupRequest(invalidPickupRequest))
      .rejects.toThrow('Either the destination or the origin company is invalid.');
  });

  it('should throw error for invalid item name', async () => {
    // Mock successful company lookups
    mockGetCompanyByName.mockResolvedValueOnce({ id: 1, name: 'Company A' });
    mockGetCompanyByName.mockResolvedValueOnce({ id: 2, name: 'Company B' });

    const invalidPickupRequest: PickupRequestRequest = {
      originalExternalOrderId: '1234567890',
      originCompany: 'Company A',
      destinationCompany: 'Company B',
      items: [
        { itemName: 'copper', quantity: 10, measurementType: 'KG' },
        { itemName: 'invalid_item', quantity: 5, measurementType: 'KG' }
      ]
    };

    await expect(validatePickupRequest(invalidPickupRequest))
      .rejects.toThrow('You have tried to order an item which we do not support (invalid_item)');
  });
});
