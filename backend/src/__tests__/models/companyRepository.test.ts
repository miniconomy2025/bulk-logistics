import {
  insertCompany,
  getCertificateByCompanyName,
  findAccountNumberByCompanyName,
  getCompanyByName,
  updateCompanyDetails,
} from '../../models/companyRepository';

import database from '../../config/database';

jest.mock('../../config/database');

const mockedQuery = database.query as jest.Mock;

describe('Company Repository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('insertCompany', () => {
    it('should insert and return the new company', async () => {
      const mockRow = {
        company_id: 1,
        company_name: 'Test Corp',
        certificate_identifier: 'ABC123',
        bank_account_number: '12345678',
      };

      mockedQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await insertCompany('Test Corp', 'ABC123', '12345678');

      expect(mockedQuery).toHaveBeenCalledWith(
        'INSERT INTO company (company_name, certificate_identifier, bank_account_number) VALUES ($1, $2, $3) RETURNING *',
        ['Test Corp', 'ABC123', '12345678'],
      );

      expect(result).toEqual(mockRow);
    });
  });

  describe('getCertificateByCompanyName', () => {
    it('should return the certificate identifier if found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ certificate_identifier: 'XYZ789' }] });

      const result = await getCertificateByCompanyName('Test Corp');

      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT certificate_identifier FROM company WHERE company_name = $1',
        ['Test Corp'],
      );

      expect(result).toBe('XYZ789');
    });

    it('should return null if no record is found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getCertificateByCompanyName('Unknown Corp');

      expect(result).toBeNull();
    });
  });

  describe('findAccountNumberByCompanyName', () => {
    it('should return the bank account number if found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ bank_account_number: '111222' }] });

      const result = await findAccountNumberByCompanyName('Test Corp');

      expect(result).toBe('111222');
    });

    it('should return null if not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await findAccountNumberByCompanyName('Unknown Corp');

      expect(result).toBeNull();
    });
  });

  describe('getCompanyByName', () => {
    it('should return a Company object if found', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          company_id: 5,
          company_name: 'Test Inc',
          company_url: 'https://test.com',
          certificate_identifier: 'CERT123',
          bank_account_number: 'ACC987',
        }],
      });

      const result = await getCompanyByName('Test Inc');

      expect(result).toEqual({
        id: 5,
        companyName: 'Test Inc',
        companyURL: 'https://test.com',
        certificateIdentifier: 'CERT123',
        bankAccountNumber: 'ACC987',
      });
    });

    it('should return null if no company is found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getCompanyByName('Unknown Inc');

      expect(result).toBeNull();
    });
  });

  describe('updateCompanyDetails', () => {
    it('should update and return the company', async () => {
      const updatedRow = {
        company_id: 3,
        company_name: 'Test Co',
        company_url: 'https://testco.com',
        certificate_identifier: 'CERTNEW',
        bank_account_number: 'BANKNEW',
      };

      mockedQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await updateCompanyDetails('Test Co', {
        bankAccountNumber: 'BANKNEW',
      });

      expect(mockedQuery).toHaveBeenCalledWith(expect.any(String), ['BANKNEW', 'Test Co']);

      expect(result).toEqual({
        id: 3,
        companyName: 'Test Co',
        companyURL: 'https://testco.com',
        certificateIdentifier: 'CERTNEW',
        bankAccountNumber: 'BANKNEW',
      });
    });

    it('should return null if no rows are updated', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] });

      const result = await updateCompanyDetails('Nonexistent', { bankAccountNumber: 'XXX' });

      expect(result).toBeNull();
    });
  });
});