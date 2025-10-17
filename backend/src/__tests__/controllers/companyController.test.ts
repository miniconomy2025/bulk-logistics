import { Request, Response } from 'express';
import { createCompany, getCertificateIdentifierForCompany } from '../../controllers/companyController';
import { insertCompany, getCertificateByCompanyName } from '../../models/companyRepository';

jest.mock('../../models/companyRepository');
const mockedInsertCompany = insertCompany as jest.Mock;
const mockedGetCertificateByCompanyName = getCertificateByCompanyName as jest.Mock;

describe('Company Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = { body: {} };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    it('should return 400 if companyName is missing', async () => {
      mockReq.body = { certificatePem: 'cert', bankAccountNumber: '123' };

      await createCompany(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Company name is required.' });
    });

    it('should return 400 if certificatePem is missing', async () => {
      mockReq.body = { companyName: 'Test Co', bankAccountNumber: '123' };

      await createCompany(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'certificatePem is required.' });
    });

    it('should create company and return 201 with company data', async () => {
      const mockCompany = { id: 1, company_name: 'Test Co', certificate_identifier: 'abc123' };
      mockReq.body = {
        companyName: 'Test Co',
        certificatePem: '-----BEGIN CERTIFICATE-----\nMIIC\n-----END CERTIFICATE-----',
        bankAccountNumber: '123456',
      };
      mockedInsertCompany.mockResolvedValueOnce(mockCompany);

      await createCompany(mockReq as Request, mockRes as Response);

      expect(mockedInsertCompany).toHaveBeenCalledWith('Test Co', expect.any(String), '123456');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockCompany);
    });

    it('should return 500 on internal error', async () => {
      mockReq.body = {
        companyName: 'Test Co',
        certificatePem: '-----BEGIN CERTIFICATE-----\nMIIC\n-----END CERTIFICATE-----',
      };
      mockedInsertCompany.mockRejectedValueOnce(new Error('DB error'));

      await createCompany(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error.' });
    });
  });

  describe('getCertificateIdentifierForCompany', () => {
    it('should return 400 if companyName is missing', async () => {
      mockReq.body = {};

      await getCertificateIdentifierForCompany(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Company name is required.' });
    });

    it('should return 404 if company not found', async () => {
      mockReq.body = { companyName: 'Unknown Co' };
      mockedGetCertificateByCompanyName.mockResolvedValueOnce(null);

      await getCertificateIdentifierForCompany(mockReq as Request, mockRes as Response);

      expect(mockedGetCertificateByCompanyName).toHaveBeenCalledWith('Unknown Co');
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Company not found.' });
    });

    it('should return 200 with certificate identifier', async () => {
      mockReq.body = { companyName: 'Test Co' };
      mockedGetCertificateByCompanyName.mockResolvedValueOnce('abc123');

      await getCertificateIdentifierForCompany(mockReq as Request, mockRes as Response);

      expect(mockedGetCertificateByCompanyName).toHaveBeenCalledWith('Test Co');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ certificateIdentifier: 'abc123' });
    });

    it('should return 500 on internal error', async () => {
      mockReq.body = { companyName: 'Test Co' };
      mockedGetCertificateByCompanyName.mockRejectedValueOnce(new Error('DB error'));

      await getCertificateIdentifierForCompany(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error.' });
    });
  });
});
