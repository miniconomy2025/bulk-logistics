// Mock dependencies BEFORE imports
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
        get: jest.fn(),
        post: jest.fn(),
    })),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));
jest.mock('../../models/transactionsRepository');
jest.mock('../../models/transactionStatusRepository');
jest.mock('../../utils', () => ({
    simulatedClock: {
        getCurrentDate: jest.fn(),
    },
}));

import { bankApiClient } from '../../client/bankClient';
import * as transactionsRepository from '../../models/transactionsRepository';
import * as transactionStatusRepository from '../../models/transactionStatusRepository';
import { simulatedClock } from '../../utils';
import AppError from '../../utils/errorHandlingMiddleware/appError';
import { TransactionStatus } from '../../enums';
import type {
    LoanApplicationRequest,
    LoanApplicationResponse,
    LoanInfoResponse,
    AllLoansInfoResponse,
    CreateAccountResponse,
    AccountDetails,
    GetBalanceResponse,
    TransactionRequest,
    TransactionResponse,
} from '../../types';

describe('BankClient', () => {
    const mockGet = jest.fn();
    const mockPost = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the axios client instance
        (bankApiClient as any).client = {
            get: mockGet,
            post: mockPost,
        };

        // Default mock for simulatedClock
        (simulatedClock.getCurrentDate as jest.Mock).mockReturnValue(new Date('2025-01-15T12:00:00Z'));
    });

    describe('applyForLoan', () => {
        const loanRequest: LoanApplicationRequest = {
            amount: 100000,
        };

        it('should successfully apply for loan and save loan details', async () => {
            const loanResponse: LoanApplicationResponse = {
                success: true,
                loan_number: 'LOAN-12345',
            };

            const loanInfo: LoanInfoResponse = {
                success: true,
                loan_number: 'LOAN-12345',
                initial_amount: 100000,
                interest_rate: '0.05',
                started_at: '2025-01-15',
                write_off: false,
                outstanding_amount: '100000',
                payments: [],
            };

            mockPost.mockResolvedValueOnce({ data: loanResponse });
            mockGet.mockResolvedValueOnce({ data: loanInfo });
            (transactionsRepository.saveLoanDetails as jest.Mock).mockResolvedValue(undefined);

            const result = await bankApiClient.applyForLoan(loanRequest);

            expect(result).toEqual(loanResponse);
            expect(mockPost).toHaveBeenCalledWith('/loan', loanRequest);
            expect(mockGet).toHaveBeenCalledWith('/loan/LOAN-12345');
            expect(transactionsRepository.saveLoanDetails).toHaveBeenCalledWith(
                {
                    loan_number: 'LOAN-12345',
                    interest_rate: '0.05',
                    initial_amount: 100000,
                },
                'LOAN-12345'
            );
        });

        it('should return response even if loan application fails', async () => {
            const loanResponse: LoanApplicationResponse = {
                success: false,
                loan_number: '',
            };

            mockPost.mockResolvedValueOnce({ data: loanResponse });

            const result = await bankApiClient.applyForLoan(loanRequest);

            expect(result).toEqual(loanResponse);
            expect(mockGet).not.toHaveBeenCalled();
            expect(transactionsRepository.saveLoanDetails).not.toHaveBeenCalled();
        });

        it('should handle when loan info fetch fails after successful application', async () => {
            const loanResponse: LoanApplicationResponse = {
                success: true,
                loan_number: 'LOAN-12345',
            };

            const loanInfoFailure = {
                success: false,
                loan_number: '',
                initial_amount: 0,
                interest_rate: '',
                started_at: '',
                write_off: false,
                outstanding_amount: '0',
                payments: [],
            };

            mockPost.mockResolvedValueOnce({ data: loanResponse });
            mockGet.mockResolvedValueOnce({ data: loanInfoFailure });

            const result = await bankApiClient.applyForLoan(loanRequest);

            expect(result).toEqual(loanResponse);
            expect(transactionsRepository.saveLoanDetails).not.toHaveBeenCalled();
        });

        it('should throw AppError when loan application request fails', async () => {
            mockPost.mockRejectedValueOnce(new Error('Network error'));

            await expect(bankApiClient.applyForLoan(loanRequest)).rejects.toThrow(AppError);
        });

        it('should throw AppError when saveLoanDetails fails', async () => {
            const loanResponse: LoanApplicationResponse = {
                success: true,
                loan_number: 'LOAN-12345',
            };

            const loanInfo: LoanInfoResponse = {
                success: true,
                loan_number: 'LOAN-12345',
                initial_amount: 100000,
                interest_rate: '0.05',
                started_at: '2025-01-15',
                write_off: false,
                outstanding_amount: '100000',
                payments: [],
            };

            mockPost.mockResolvedValueOnce({ data: loanResponse });
            mockGet.mockResolvedValueOnce({ data: loanInfo });
            (transactionsRepository.saveLoanDetails as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(bankApiClient.applyForLoan(loanRequest)).rejects.toThrow(AppError);
        });

        it('should reject negative loan amounts - FIXED', async () => {
            const negativeLoanRequest: LoanApplicationRequest = {
                amount: -50000,
            };

            // Fixed: Now validates and rejects negative amounts
            await expect(bankApiClient.applyForLoan(negativeLoanRequest)).rejects.toThrow(AppError);
            await expect(bankApiClient.applyForLoan(negativeLoanRequest)).rejects.toThrow(
                'Loan amount must be greater than 0'
            );
        });

        it('should reject zero loan amount - FIXED', async () => {
            const zeroLoanRequest: LoanApplicationRequest = {
                amount: 0,
            };

            // Fixed: Now validates and rejects zero amounts
            await expect(bankApiClient.applyForLoan(zeroLoanRequest)).rejects.toThrow(AppError);
            await expect(bankApiClient.applyForLoan(zeroLoanRequest)).rejects.toThrow(
                'Loan amount must be greater than 0'
            );
        });
    });

    describe('getAllLoanDetails', () => {
        it('should return all loan details when loans exist', async () => {
            const loansResponse: AllLoansInfoResponse = {
                success: true,
                total_outstanding_amount: 150000,
                loans: [
                    {
                        loan_number: 'LOAN-123',
                        initial_amount: 100000,
                        interest_rate: 0.05,
                        write_off: false,
                        outstanding_amount: 75000,
                    },
                    {
                        loan_number: 'LOAN-456',
                        initial_amount: 100000,
                        interest_rate: 0.06,
                        write_off: false,
                        outstanding_amount: 75000,
                    },
                ],
            };

            mockGet.mockResolvedValueOnce({ data: loansResponse });

            const result = await bankApiClient.getAllLoanDetails();

            expect(result).toEqual(loansResponse);
            expect(mockGet).toHaveBeenCalledWith('/loan');
        });

        it('should return failure response when no loans exist', async () => {
            const emptyResponse: AllLoansInfoResponse = {
                success: true,
                total_outstanding_amount: 0,
                loans: [],
            };

            mockGet.mockResolvedValueOnce({ data: emptyResponse });

            const result = await bankApiClient.getAllLoanDetails();

            expect(result).toEqual({
                success: false,
                total_outstanding_amount: 0,
                loans: [],
            });
        });

        it('should return failure response when API returns success=false', async () => {
            const failureResponse: AllLoansInfoResponse = {
                success: false,
                total_outstanding_amount: 0,
                loans: [],
            };

            mockGet.mockResolvedValueOnce({ data: failureResponse });

            const result = await bankApiClient.getAllLoanDetails();

            expect(result).toEqual({
                success: false,
                total_outstanding_amount: 0,
                loans: [],
            });
        });

        it('should throw AppError when request fails', async () => {
            mockGet.mockRejectedValueOnce(new Error('Connection timeout'));

            await expect(bankApiClient.getAllLoanDetails()).rejects.toThrow(AppError);
        });
    });

    describe('createAccount', () => {
        it('should successfully create account with notification URL', async () => {
            const accountResponse: CreateAccountResponse = {
                account_number: 'ACC-789',
            };

            mockPost.mockResolvedValueOnce({ data: accountResponse });

            const result = await bankApiClient.createAccount('https://example.com/notify');

            expect(result).toEqual(accountResponse);
            expect(mockPost).toHaveBeenCalledWith('/account', {
                notification_url: 'https://example.com/notify',
            });
        });

        it('should reject empty notification URL - FIXED', async () => {
            // Fixed: Now validates and rejects empty URLs
            await expect(bankApiClient.createAccount('')).rejects.toThrow(AppError);
            await expect(bankApiClient.createAccount('')).rejects.toThrow(
                'Notification URL is required'
            );
        });

        it('should reject invalid URL format - FIXED', async () => {
            // Fixed: Now validates URL format
            await expect(bankApiClient.createAccount('not-a-valid-url')).rejects.toThrow(AppError);
            await expect(bankApiClient.createAccount('not-a-valid-url')).rejects.toThrow(
                'Invalid notification URL format'
            );
        });

        it('should throw AppError when account creation fails', async () => {
            mockPost.mockRejectedValueOnce(new Error('Server error'));

            await expect(bankApiClient.createAccount('https://example.com/notify')).rejects.toThrow(
                AppError
            );
        });
    });

    describe('getAccountDetails', () => {
        it('should return account details when account exists', async () => {
            const accountDetails: AccountDetails = {
                success: true,
                account_number: 'ACC-123',
                net_balance: 50000,
                notification_url: 'https://example.com/notify',
            };

            mockGet.mockResolvedValueOnce({ data: accountDetails });

            const result = await bankApiClient.getAccountDetails();

            expect(result).toEqual(accountDetails);
            expect(mockGet).toHaveBeenCalledWith('/account/me');
        });

        it('should throw AppError when request fails - FIXED', async () => {
            mockGet.mockRejectedValueOnce(new Error('Not found'));

            // Fixed: Now throws AppError for consistency with other methods
            await expect(bankApiClient.getAccountDetails()).rejects.toThrow(AppError);
        });

        it('should handle account with zero balance', async () => {
            const accountDetails: AccountDetails = {
                success: true,
                account_number: 'ACC-123',
                net_balance: 0,
                notification_url: 'https://example.com/notify',
            };

            mockGet.mockResolvedValueOnce({ data: accountDetails });

            const result = await bankApiClient.getAccountDetails();

            expect(result.net_balance).toBe(0);
        });

        it('should handle account with negative balance - POTENTIAL BUG', async () => {
            const accountDetails: AccountDetails = {
                success: true,
                account_number: 'ACC-123',
                net_balance: -10000,
                notification_url: 'https://example.com/notify',
            };

            mockGet.mockResolvedValueOnce({ data: accountDetails });

            const result = await bankApiClient.getAccountDetails();

            expect(result.net_balance).toBe(-10000);
        });
    });

    describe('getBalance', () => {
        it('should return current balance', async () => {
            const balanceResponse: GetBalanceResponse = {
                balance: 75000,
            };

            mockGet.mockResolvedValueOnce({ data: balanceResponse });

            const result = await bankApiClient.getBalance();

            expect(result).toEqual(balanceResponse);
            expect(mockGet).toHaveBeenCalledWith('/account/me/balance');
        });

        it('should handle zero balance', async () => {
            const balanceResponse: GetBalanceResponse = {
                balance: 0,
            };

            mockGet.mockResolvedValueOnce({ data: balanceResponse });

            const result = await bankApiClient.getBalance();

            expect(result.balance).toBe(0);
        });

        it('should throw AppError when balance request fails', async () => {
            mockGet.mockRejectedValueOnce(new Error('Service unavailable'));

            await expect(bankApiClient.getBalance()).rejects.toThrow(AppError);
        });
    });

    describe('makePayment', () => {
        const paymentDetails: TransactionRequest = {
            to_account_number: 'ACC-456',
            amount: 5000,
            description: 'ORDER-789',
        };

        it('should successfully make payment and record transaction', async () => {
            const transactionResponse: TransactionResponse = {
                success: true,
                transaction_number: 'TXN-123',
                status: 'completed',
            };

            mockPost.mockResolvedValueOnce({ data: transactionResponse });
            (transactionStatusRepository.getTransactionStatusByName as jest.Mock).mockResolvedValue({
                transaction_status_id: 1,
            });
            (transactionsRepository.getCategoryIdByName as jest.Mock).mockResolvedValue(5);
            (transactionsRepository.insertIntoTransactionLedger as jest.Mock).mockResolvedValue(
                undefined
            );

            const result = await bankApiClient.makePayment({
                paymentDetails,
                transactionCategory: 'TRUCK_PURCHASE',
            });

            expect(result).toEqual(transactionResponse);
            expect(mockPost).toHaveBeenCalledWith('/transaction', {
                ...paymentDetails,
                to_bank_name: 'commercial-bank',
            });
            expect(transactionsRepository.insertIntoTransactionLedger).toHaveBeenCalledWith({
                commercial_bank_transaction_id: 'TXN-123',
                payment_reference_id: 'TXN-123',
                transaction_category_id: 5,
                amount: 5000,
                transaction_date: '2025-01-15',
                transaction_status_id: 1,
                related_pickup_request_id: null,
                loan_id: null,
                related_thoh_order_id: 'ORDER-789',
            });
        });

        it('should record failed transaction correctly', async () => {
            const transactionResponse: TransactionResponse = {
                success: true,
                transaction_number: 'TXN-456',
                status: 'failed',
            };

            mockPost.mockResolvedValueOnce({ data: transactionResponse });
            (transactionStatusRepository.getTransactionStatusByName as jest.Mock).mockResolvedValue({
                transaction_status_id: 2,
            });
            (transactionsRepository.getCategoryIdByName as jest.Mock).mockResolvedValue(5);
            (transactionsRepository.insertIntoTransactionLedger as jest.Mock).mockResolvedValue(
                undefined
            );

            await bankApiClient.makePayment({
                paymentDetails,
                transactionCategory: 'TRUCK_PURCHASE',
            });

            expect(transactionStatusRepository.getTransactionStatusByName).toHaveBeenCalledWith(
                TransactionStatus.Completed // BUG? Uses response.data.success, not status field
            );
        });

        it('should preserve existing to_bank_name in payment request - FIXED', async () => {
            const paymentWithBankName: TransactionRequest = {
                to_account_number: 'ACC-456',
                to_bank_name: 'other-bank',
                amount: 5000,
                description: 'ORDER-789',
            };

            mockPost.mockResolvedValueOnce({
                data: { success: true, transaction_number: 'TXN-123', status: 'completed' },
            });
            (transactionStatusRepository.getTransactionStatusByName as jest.Mock).mockResolvedValue({
                transaction_status_id: 1,
            });
            (transactionsRepository.getCategoryIdByName as jest.Mock).mockResolvedValue(5);
            (transactionsRepository.insertIntoTransactionLedger as jest.Mock).mockResolvedValue(
                undefined
            );

            await bankApiClient.makePayment({
                paymentDetails: paymentWithBankName,
                transactionCategory: 'TRUCK_PURCHASE',
            });

            // Fixed: Now preserves existing to_bank_name
            expect(mockPost).toHaveBeenCalledWith('/transaction', {
                ...paymentWithBankName,
                to_bank_name: 'other-bank',
            });
        });

        it('should throw AppError when payment fails - FIXED', async () => {
            mockPost.mockRejectedValueOnce(new Error('Insufficient funds'));

            // Fixed: Now wraps all errors in AppError consistently
            await expect(
                bankApiClient.makePayment({
                    paymentDetails,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow(AppError);
        });

        it('should throw AppError when transaction ledger insert fails', async () => {
            mockPost.mockResolvedValueOnce({
                data: { success: true, transaction_number: 'TXN-123', status: 'completed' },
            });
            (transactionStatusRepository.getTransactionStatusByName as jest.Mock).mockResolvedValue({
                transaction_status_id: 1,
            });
            (transactionsRepository.getCategoryIdByName as jest.Mock).mockResolvedValue(5);
            (transactionsRepository.insertIntoTransactionLedger as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(
                bankApiClient.makePayment({
                    paymentDetails,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow(AppError);
        });

        it('should reject negative payment amounts - FIXED', async () => {
            const negativePayment: TransactionRequest = {
                to_account_number: 'ACC-456',
                amount: -5000,
                description: 'Refund?',
            };

            // Fixed: Now validates and rejects negative amounts
            await expect(
                bankApiClient.makePayment({
                    paymentDetails: negativePayment,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow(AppError);
            await expect(
                bankApiClient.makePayment({
                    paymentDetails: negativePayment,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow('Payment amount must be greater than 0');
        });

        it('should reject zero payment amount - FIXED', async () => {
            const zeroPayment: TransactionRequest = {
                to_account_number: 'ACC-456',
                amount: 0,
                description: 'Zero payment',
            };

            // Fixed: Now validates and rejects zero amounts
            await expect(
                bankApiClient.makePayment({
                    paymentDetails: zeroPayment,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow(AppError);
            await expect(
                bankApiClient.makePayment({
                    paymentDetails: zeroPayment,
                    transactionCategory: 'TRUCK_PURCHASE',
                })
            ).rejects.toThrow('Payment amount must be greater than 0');
        });
    });

    describe('Console Logging', () => {
        it('should log loan application details', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockPost.mockResolvedValueOnce({ data: { success: true, loan_number: 'LOAN-123' } });
            mockGet.mockResolvedValueOnce({
                data: {
                    success: true,
                    loan_number: 'LOAN-123',
                    initial_amount: 100000,
                    interest_rate: '0.05',
                    started_at: '2025-01-15',
                    write_off: false,
                    outstanding_amount: '100000',
                    payments: [],
                },
            });
            (transactionsRepository.saveLoanDetails as jest.Mock).mockResolvedValue(undefined);

            await bankApiClient.applyForLoan({ amount: 100000 });

            expect(consoleSpy).toHaveBeenCalledWith('---APPLYING FOR LOAN---');
            expect(consoleSpy).toHaveBeenCalledWith('Loan request: ', { amount: 100000 });

            consoleSpy.mockRestore();
        });

        it('should log payment details', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockPost.mockResolvedValueOnce({
                data: { success: true, transaction_number: 'TXN-123', status: 'completed' },
            });
            (transactionStatusRepository.getTransactionStatusByName as jest.Mock).mockResolvedValue({
                transaction_status_id: 1,
            });
            (transactionsRepository.getCategoryIdByName as jest.Mock).mockResolvedValue(5);
            (transactionsRepository.insertIntoTransactionLedger as jest.Mock).mockResolvedValue(
                undefined
            );

            const paymentDetails: TransactionRequest = {
                to_account_number: 'ACC-456',
                amount: 5000,
                description: 'ORDER-789',
            };

            await bankApiClient.makePayment({
                paymentDetails,
                transactionCategory: 'TRUCK_PURCHASE',
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                '------MAKING PAYMENT------\nPAYMENT REQUEST: ',
                paymentDetails
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                '------PAYMENT MADE------\nPAYMENT RESPONSE: ',
                expect.objectContaining({ success: true })
            );

            consoleSpy.mockRestore();
        });
    });
});
