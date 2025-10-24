/**
 * Bank Notification Integration Tests
 *
 * Tests the bank notification webhook handler including:
 * - Payment confirmation processing
 * - Transaction validation
 * - Pickup request status updates
 * - Duplicate transaction handling
 * - Error scenarios
 */

import request from 'supertest';
import { setupAllMocks, cleanupMocks } from './mocks/setup';
import app from '../../app';

// Mock database repositories
jest.mock('../../models/transactionsRepository');
jest.mock('../../models/companyRepository');
jest.mock('../../services/AutonomyService');

import * as transactionsRepo from '../../models/transactionsRepository';
import * as companyRepo from '../../models/companyRepository';

describe('Bank Notification Integration Tests', () => {
    beforeEach(() => {
        setupAllMocks();
        jest.clearAllMocks();
        setupDefaultMocks();
    });

    afterEach(() => {
        cleanupMocks();
    });

    describe('POST /api/bank - Payment Notifications', () => {
        describe('Success Scenarios - Pickup Request Payments', () => {
            it('should process payment confirmation for pending pickup request', async () => {
                const paymentReferenceId = '123e4567-e89b-12d3-a456-426614174000';

                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TXN-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: paymentReferenceId
                    });

                expect(response.status).toBe(201);
                expect(response.body.message).toBe('Transaction recorded');
                expect(transactionsRepo.updatePaymentStatusForPickupRequest).toHaveBeenCalledWith(
                    expect.objectContaining({
                        transaction_number: 'TXN-001',
                        amount: 500.00,
                        status: 'CONFIRMED'
                    })
                );
            });

            it('should process payment with payment_reference_id field', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TXN-002',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 750.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference_id: '123e4567-e89b-12d3-a456-426614174001'
                    });

                expect(response.status).toBe(201);
                expect(transactionsRepo.updatePaymentStatusForPickupRequest).toHaveBeenCalled();
            });

            it('should handle large payment amounts', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TXN-LARGE-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 15000.00, // Large order
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174002'
                    });

                expect(response.status).toBe(201);
            });
        });

        describe('Success Scenarios - General Transactions', () => {
            it('should record loan disbursement transaction', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'LOAN-TXN-001',
                        from: 'BANK-ACCOUNT',
                        to: 'BL-ACCOUNT-123',
                        amount: 100000.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
                expect(transactionsRepo.createLedgerEntry).toHaveBeenCalledWith(
                    expect.objectContaining({
                        transaction_number: 'LOAN-TXN-001',
                        amount: 100000.00
                    })
                );
            });

            it('should record payment to THOH for trucks', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TRUCK-PAYMENT-001',
                        from: 'BL-ACCOUNT-123',
                        to: 'THOH-ACCOUNT',
                        amount: 400000.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
                expect(transactionsRepo.createLedgerEntry).toHaveBeenCalled();
            });

            it('should record operational cost payment', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'OPS-COST-001',
                        from: 'BL-ACCOUNT-123',
                        to: 'THOH-ACCOUNT',
                        amount: 1500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
            });
        });

        describe('Failure Scenarios - Invalid Transactions', () => {
            it('should reject transaction with missing required fields', async () => {
                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'INVALID-001',
                        from: 'PEAR-ACCOUNT-123',
                        // Missing 'to' field
                        amount: 500.00,
                        status: 'CONFIRMED'
                    });

                expect(response.status).toBe(400);
                expect(response.body.error).toContain('Invalid transaction data');
            });

            it('should reject transaction with missing transaction_number', async () => {
                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(400);
            });

            it('should reject transaction with missing amount', async () => {
                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'INVALID-002',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(400);
            });

            it('should reject transaction not involving bulk-logistics account', async () => {
                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'UNRELATED-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'SUMSANG-ACCOUNT-456',
                        amount: 1000.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(400);
                expect(response.body.error).toContain('does not involve our account');
            });
        });

        describe('Duplicate Transaction Handling', () => {
            it('should detect and reject duplicate transaction', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(409);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'DUPLICATE-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(409);
                expect(response.body.error).toBe('Duplicate transaction');
            });

            it('should allow same amount from different transaction numbers', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TXN-UNIQUE-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174003'
                    });

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'TXN-UNIQUE-002',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174004'
                    });

                expect(response.status).toBe(201);
            });
        });

        describe('Transaction Status Variations', () => {
            it('should process PENDING transaction', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'PENDING-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'PENDING',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174005'
                    });

                expect(response.status).toBe(201);
            });

            it('should process FAILED transaction', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'FAILED-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'FAILED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174006'
                    });

                expect(response.status).toBe(201);
            });
        });

        describe('Edge Cases', () => {
            it('should handle zero amount transactions', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'ZERO-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 0,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
            });

            it('should handle decimal amounts correctly', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'DECIMAL-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 123.45,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174007'
                    });

                expect(response.status).toBe(201);
            });

            it('should handle transactions with bulk-logistics as sender', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'OUTGOING-001',
                        from: 'BL-ACCOUNT-123',
                        to: 'THOH-ACCOUNT',
                        amount: 50000.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
            });

            it('should handle transactions with bulk-logistics as receiver', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'INCOMING-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 750.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(201);
            });
        });

        describe('Error Handling', () => {
            it('should handle database connection failure', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockRejectedValue(
                    new Error('Database connection lost')
                );

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'DB-ERROR-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174008'
                    });

                expect(response.status).toBe(500);
                expect(response.body.message).toContain('Something went wrong');
            });

            it('should handle ledger entry creation failure', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(0);
                (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(500);

                const response = await request(app)
                    .post('/api/bank')
                    .send({
                        transaction_number: 'LEDGER-ERROR-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now()
                    });

                expect(response.status).toBe(500);
                expect(response.body.error).toBe('Internal server error');
            });
        });

        describe('Real-World Scenarios', () => {
            it('should handle rapid consecutive payments', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                const responses = await Promise.all([
                    request(app).post('/api/bank').send({
                        transaction_number: 'RAPID-001',
                        from: 'PEAR-ACCOUNT-123',
                        to: 'BL-ACCOUNT-123',
                        amount: 500.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174009'
                    }),
                    request(app).post('/api/bank').send({
                        transaction_number: 'RAPID-002',
                        from: 'SUMSANG-ACCOUNT-456',
                        to: 'BL-ACCOUNT-123',
                        amount: 750.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174010'
                    }),
                    request(app).post('/api/bank').send({
                        transaction_number: 'RAPID-003',
                        from: 'RECYCLER-ACCOUNT',
                        to: 'BL-ACCOUNT-123',
                        amount: 1000.00,
                        status: 'CONFIRMED',
                        timestamp: Date.now(),
                        payment_reference: '123e4567-e89b-12d3-a456-426614174011'
                    })
                ]);

                responses.forEach(response => {
                    expect(response.status).toBe(201);
                });
            });

            it('should handle payment for multiple pickup requests in sequence', async () => {
                (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);

                for (let i = 1; i <= 5; i++) {
                    const response = await request(app)
                        .post('/api/bank')
                        .send({
                            transaction_number: `SEQ-PAYMENT-${i}`,
                            from: 'PEAR-ACCOUNT-123',
                            to: 'BL-ACCOUNT-123',
                            amount: 500 * i,
                            status: 'CONFIRMED',
                            timestamp: Date.now(),
                            payment_reference: `123e4567-e89b-12d3-a456-42661417${4012 + i}`
                        });

                    expect(response.status).toBe(201);
                }
            });
        });
    });
});

// ============================================================================
// Helper Functions
// ============================================================================

function setupDefaultMocks() {
    (companyRepo.findAccountNumberByCompanyName as jest.Mock).mockResolvedValue('BL-ACCOUNT-123');

    (transactionsRepo.updatePaymentStatusForPickupRequest as jest.Mock).mockResolvedValue(1);
    (transactionsRepo.createLedgerEntry as jest.Mock).mockResolvedValue(201);
}
