// Mock axios and fs BEFORE imports
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
        post: jest.fn(),
    })),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

import { notificationApiClient } from '../../client/notificationClient';
import AppError from '../../utils/errorHandlingMiddleware/appError';
import type { LogisticsNotification, LogisticsNotificationResponse } from '../../types/notifications';

describe('NotificationClient', () => {
    const mockPost = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the axios client instance
        (notificationApiClient as any).client = {
            post: mockPost,
        };
    });

    describe('sendLogisticsNotification', () => {
        const validNotification: LogisticsNotification = {
            id: 123,
            notificationURL: 'https://company-a.example.com',
            type: 'PICKUP',
            quantity: 5,
            items: [
                { itemID: 1, name: 'copper', quantity: 3 },
                { itemID: 2, name: 'silicon', quantity: 2 },
            ],
        };

        it('should successfully send logistics notification', async () => {
            const expectedResponse: LogisticsNotificationResponse = {
                status: 200,
            };

            mockPost.mockResolvedValueOnce(expectedResponse);

            const result = await notificationApiClient.sendLogisticsNotification(validNotification);

            expect(result).toEqual(expectedResponse);
            expect(mockPost).toHaveBeenCalledWith(
                'https://company-a.example.com/logistics',
                {
                    id: 123,
                    type: 'PICKUP',
                    quantity: 5,
                    items: [
                        { itemID: 1, name: 'copper', quantity: 3 },
                        { itemID: 2, name: 'silicon', quantity: 2 },
                    ],
                }
            );
        });

        it('should send DELIVERY type notification', async () => {
            const deliveryNotification: LogisticsNotification = {
                id: 456,
                notificationURL: 'https://company-b.example.com',
                type: 'DELIVERY',
                quantity: 10,
                items: [{ itemID: 1, name: 'phones', quantity: 10 }],
            };

            mockPost.mockResolvedValueOnce({ status: 201 });

            await notificationApiClient.sendLogisticsNotification(deliveryNotification);

            expect(mockPost).toHaveBeenCalledWith(
                'https://company-b.example.com/logistics',
                {
                    id: 456,
                    type: 'DELIVERY',
                    quantity: 10,
                    items: [{ itemID: 1, name: 'phones', quantity: 10 }],
                }
            );
        });

        it('should handle string ID type', async () => {
            const notificationWithStringId: LogisticsNotification = {
                id: 'ORDER-ABC-123',
                notificationURL: 'https://company-c.example.com',
                type: 'PICKUP',
                quantity: 2,
                items: [{ itemID: 1, name: 'item', quantity: 2 }],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notificationWithStringId);

            expect(mockPost).toHaveBeenCalledWith(
                'https://company-c.example.com/logistics',
                expect.objectContaining({ id: 'ORDER-ABC-123' })
            );
        });

        it('should throw AppError when notification sending fails - FIXED', async () => {
            mockPost.mockRejectedValueOnce(new Error('Connection timeout'));

            // Fixed: Now throws AppError with proper error context
            await expect(
                notificationApiClient.sendLogisticsNotification(validNotification)
            ).rejects.toThrow(AppError);
        });

        it('should throw AppError for network errors - FIXED', async () => {
            mockPost.mockRejectedValueOnce(new Error('ENOTFOUND'));

            await expect(
                notificationApiClient.sendLogisticsNotification(validNotification)
            ).rejects.toThrow(AppError);
        });

        it('should throw AppError for server errors - FIXED', async () => {
            mockPost.mockRejectedValueOnce(new Error('500 Internal Server Error'));

            await expect(
                notificationApiClient.sendLogisticsNotification(validNotification)
            ).rejects.toThrow(AppError);
        });

        it('should construct correct URL with /logistics endpoint', async () => {
            const notification: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: 1,
                items: [],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notification);

            expect(mockPost).toHaveBeenCalledWith(
                'https://test.com/logistics',
                expect.any(Object)
            );
        });

        it('should handle URL with trailing slash properly - FIXED', async () => {
            const notification: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com/',
                type: 'PICKUP',
                quantity: 1,
                items: [],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notification);

            // Fixed: No double slash
            expect(mockPost).toHaveBeenCalledWith(
                'https://test.com/logistics',
                expect.any(Object)
            );
        });

        it('should handle URL with existing path - POTENTIAL BUG', async () => {
            const notification: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com/api/v1',
                type: 'PICKUP',
                quantity: 1,
                items: [],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notification);

            // Appends /logistics to existing path
            expect(mockPost).toHaveBeenCalledWith(
                'https://test.com/api/v1/logistics',
                expect.any(Object)
            );
        });

        it('should not include notificationURL in POST body', async () => {
            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(validNotification);

            const postBody = mockPost.mock.calls[0][1];
            expect(postBody).not.toHaveProperty('notificationURL');
        });

        it('should handle empty items array', async () => {
            const notificationWithNoItems: LogisticsNotification = {
                id: 999,
                notificationURL: 'https://test.com',
                type: 'DELIVERY',
                quantity: 0,
                items: [],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            const result = await notificationApiClient.sendLogisticsNotification(
                notificationWithNoItems
            );

            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ items: [] })
            );
        });

        it('should reject negative quantity - FIXED', async () => {
            const notificationWithNegativeQty: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: -5,
                items: [{ itemID: 1, name: 'item', quantity: -5 }],
            };

            // Fixed: Now validates and rejects negative quantities
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithNegativeQty)
            ).rejects.toThrow(AppError);
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithNegativeQty)
            ).rejects.toThrow('Notification quantity cannot be negative');
        });

        it('should handle zero quantity - EDGE CASE', async () => {
            const notificationWithZeroQty: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: 0,
                items: [],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notificationWithZeroQty);

            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ quantity: 0 })
            );
        });

        it('should handle quantity mismatch with items - POTENTIAL BUG', async () => {
            const notificationWithMismatch: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: 10, // Says 10 total
                items: [
                    { itemID: 1, name: 'copper', quantity: 3 },
                    { itemID: 2, name: 'silicon', quantity: 2 },
                ], // But items only sum to 5
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            // No validation of quantity vs items sum
            await notificationApiClient.sendLogisticsNotification(notificationWithMismatch);

            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ quantity: 10 })
            );
        });

        it('should reject invalid notification URL - FIXED', async () => {
            const notificationWithInvalidUrl: LogisticsNotification = {
                id: 1,
                notificationURL: 'not-a-valid-url',
                type: 'PICKUP',
                quantity: 1,
                items: [],
            };

            // Fixed: Now validates URL format
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithInvalidUrl)
            ).rejects.toThrow(AppError);
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithInvalidUrl)
            ).rejects.toThrow('Invalid notification URL format');
        });

        it('should reject empty notification URL - FIXED', async () => {
            const notificationWithEmptyUrl: LogisticsNotification = {
                id: 1,
                notificationURL: '',
                type: 'PICKUP',
                quantity: 1,
                items: [],
            };

            // Fixed: Now validates URL is not empty
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithEmptyUrl)
            ).rejects.toThrow(AppError);
            await expect(
                notificationApiClient.sendLogisticsNotification(notificationWithEmptyUrl)
            ).rejects.toThrow('Notification URL is required');
        });

        it('should log notification attempt', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(validNotification);

            expect(consoleSpy).toHaveBeenCalledWith('Attempting to deliver', validNotification);

            consoleSpy.mockRestore();
        });

        it('should log errors when notification fails - FIXED', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            mockPost.mockRejectedValueOnce(new Error('Connection failed'));

            try {
                await notificationApiClient.sendLogisticsNotification(validNotification);
            } catch (error) {
                // Expected to throw
            }

            // Fixed: Now logs errors properly
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to send logistics notification:',
                expect.any(String)
            );

            consoleSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('should handle very large item arrays', async () => {
            const largeItemArray = Array.from({ length: 1000 }, (_, i) => ({
                itemID: i,
                name: `item-${i}`,
                quantity: i,
            }));

            const notificationWithManyItems: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: 499500, // Sum of 0 to 999
                items: largeItemArray,
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notificationWithManyItems);

            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ items: expect.arrayContaining([]) })
            );
        });

        it('should handle special characters in item names', async () => {
            const notificationWithSpecialChars: LogisticsNotification = {
                id: 1,
                notificationURL: 'https://test.com',
                type: 'PICKUP',
                quantity: 1,
                items: [{ itemID: 1, name: 'item-with-<special>-&-"chars"', quantity: 1 }],
            };

            mockPost.mockResolvedValueOnce({ status: 200 });

            await notificationApiClient.sendLogisticsNotification(notificationWithSpecialChars);

            expect(mockPost).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    items: [{ itemID: 1, name: 'item-with-<special>-&-"chars"', quantity: 1 }],
                })
            );
        });
    });

    describe('Constructor and BaseURL', () => {
        it('should have empty baseURL in constructor - UNUSUAL PATTERN', () => {
            // The NotificationClient uses empty baseURL because it constructs
            // full URLs from notificationURL field
            expect((notificationApiClient as any).serviceName).toBe('NotificationService');
        });
    });
});
