import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseApiClient } from '../../client/baseClient';
import AppError from '../../utils/errorHandlingMiddleware/appError';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs to prevent SSL file reading errors
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-cert')),
}));

// Concrete implementation for testing abstract class
class TestApiClient extends BaseApiClient {
    constructor(baseURL: string, serviceName: string) {
        super(baseURL, serviceName);
    }

    public getClient(): AxiosInstance {
        return this.client;
    }

    public getServiceName(): string {
        return this.serviceName;
    }
}

describe('BaseApiClient', () => {
    let testClient: TestApiClient;
    const mockAxiosInstance = {
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.create.mockReturnValue(mockAxiosInstance);
    });

    describe('Constructor and Initialization', () => {
        it('should create axios instance with correct baseURL', () => {
            testClient = new TestApiClient('https://api.example.com', 'TestService');

            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.example.com',
                httpsAgent: expect.any(Object),
            });
        });

        it('should store service name correctly', () => {
            testClient = new TestApiClient('https://api.example.com', 'TestService');

            expect(testClient.getServiceName()).toBe('TestService');
        });

        it('should set up response interceptor', () => {
            testClient = new TestApiClient('https://api.example.com', 'TestService');

            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Function)
            );
        });

        it('should handle empty baseURL', () => {
            testClient = new TestApiClient('', 'EmptyURLService');

            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: '',
                httpsAgent: expect.any(Object),
            });
        });

        it('should handle special characters in service name', () => {
            testClient = new TestApiClient('https://api.example.com', 'Test-Service_123');

            expect(testClient.getServiceName()).toBe('Test-Service_123');
        });
    });

    describe('Response Interceptor - Success Handler', () => {
        it('should pass through successful responses unchanged', () => {
            testClient = new TestApiClient('https://api.example.com', 'TestService');

            // Get the success handler from the interceptor setup
            const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
            const successHandler = interceptorCall[0];

            const mockResponse = {
                data: { success: true },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {} as any,
            };

            const result = successHandler(mockResponse);

            expect(result).toBe(mockResponse);
        });
    });

    describe('Response Interceptor - Error Handler', () => {
        let errorHandler: (error: AxiosError) => void;

        beforeEach(() => {
            testClient = new TestApiClient('https://api.example.com', 'TestService');
            const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
            errorHandler = interceptorCall[1];
        });

        it('should throw AppError with 502 when response error occurs', () => {
            const axiosError: Partial<AxiosError> = {
                response: {
                    data: { error: 'Bad request' },
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any,
                },
                message: 'Request failed',
                name: 'AxiosError',
                config: {} as any,
                isAxiosError: true,
                toJSON: () => ({}),
            };

            expect(() => errorHandler(axiosError as AxiosError)).toThrow(AppError);
            expect(() => errorHandler(axiosError as AxiosError)).toThrow(
                'Request to TestService failed with status 400'
            );
        });

        it('should throw AppError with 503 when no response received (network error)', () => {
            const axiosError: Partial<AxiosError> = {
                request: {},
                message: 'Network Error',
                name: 'AxiosError',
                config: {} as any,
                isAxiosError: true,
                toJSON: () => ({}),
            };

            expect(() => errorHandler(axiosError as AxiosError)).toThrow(AppError);
            expect(() => errorHandler(axiosError as AxiosError)).toThrow(
                'Could not connect to TestService service.'
            );
        });

        it('should throw AppError with 500 for axios setup errors', () => {
            const axiosError: Partial<AxiosError> = {
                message: 'Invalid configuration',
                name: 'AxiosError',
                config: {} as any,
                isAxiosError: true,
                toJSON: () => ({}),
            };

            expect(() => errorHandler(axiosError as AxiosError)).toThrow(AppError);
            expect(() => errorHandler(axiosError as AxiosError)).toThrow(
                'An internal error occurred while preparing an external request.'
            );
        });

        it('should handle different HTTP error status codes correctly', () => {
            const testCases = [
                { status: 404, expected: 'Request to TestService failed with status 404' },
                { status: 500, expected: 'Request to TestService failed with status 500' },
                { status: 403, expected: 'Request to TestService failed with status 403' },
            ];

            testCases.forEach(({ status, expected }) => {
                const axiosError: Partial<AxiosError> = {
                    response: {
                        data: {},
                        status,
                        statusText: 'Error',
                        headers: {},
                        config: {} as any,
                    },
                    message: 'Request failed',
                    name: 'AxiosError',
                    config: {} as any,
                    isAxiosError: true,
                    toJSON: () => ({}),
                };

                expect(() => errorHandler(axiosError as AxiosError)).toThrow(expected);
            });
        });

        it('should log error details to console', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const axiosError: Partial<AxiosError> = {
                response: {
                    data: { error: 'Detailed error message' },
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any,
                },
                message: 'Request failed',
                name: 'AxiosError',
                config: {} as any,
                isAxiosError: true,
                toJSON: () => ({}),
            };

            try {
                errorHandler(axiosError as AxiosError);
            } catch (error) {
                // Expected to throw
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error from TestService API:',
                { error: 'Detailed error message' }
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Edge Cases and Bug Detection', () => {
        it('should handle undefined service name', () => {
            testClient = new TestApiClient('https://api.example.com', undefined as any);

            expect(testClient.getServiceName()).toBeUndefined();
        });

        it('should handle null baseURL', () => {
            testClient = new TestApiClient(null as any, 'TestService');

            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: null,
                httpsAgent: expect.any(Object),
            });
        });

        it('should handle very long service names', () => {
            const longName = 'A'.repeat(1000);
            testClient = new TestApiClient('https://api.example.com', longName);

            expect(testClient.getServiceName()).toBe(longName);
        });

        it('should handle special characters in error messages', () => {
            testClient = new TestApiClient('https://api.example.com', 'Test<>Service');
            const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
            const errorHandler = interceptorCall[1];

            const axiosError: Partial<AxiosError> = {
                response: {
                    data: { error: 'Error with <special> & "characters"' },
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: {} as any,
                },
                message: 'Request failed',
                name: 'AxiosError',
                config: {} as any,
                isAxiosError: true,
                toJSON: () => ({}),
            };

            expect(() => errorHandler(axiosError as AxiosError)).toThrow(
                'Request to Test<>Service failed with status 400'
            );
        });
    });

    describe('HTTPS Agent Configuration', () => {
        it('should create HTTPS agent for secure connections', () => {
            testClient = new TestApiClient('https://secure-api.example.com', 'SecureService');

            const createCall = mockedAxios.create.mock.calls[0]?.[0];
            expect(createCall?.httpsAgent).toBeDefined();
        });

        it('should handle HTTP URLs (not just HTTPS)', () => {
            testClient = new TestApiClient('http://api.example.com', 'HTTPService');

            const createCall = mockedAxios.create.mock.calls[0]?.[0];
            expect(createCall?.httpsAgent).toBeDefined();
        });
    });
});
