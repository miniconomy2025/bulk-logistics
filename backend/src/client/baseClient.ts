import axios, { AxiosInstance, AxiosError } from "axios";
import https from "https";
import fs from "fs";
import tls from "tls"; 
import AppError from "../utils/errorHandlingMiddleware/appError";

export abstract class BaseApiClient {
    protected client: AxiosInstance;
    protected serviceName: string;

    protected constructor(baseURL: string, serviceName: string) {
        this.serviceName = serviceName;

        const customCa = fs.readFileSync("/etc/ssl/bulk-logistics/root-ca.crt");

        // 3. Combine Node's default CAs with your custom one
        const allCAs = [...tls.rootCertificates, customCa];

        // --- mTLS Agent Configuration ---
        // This agent will attach your client certificate to every outgoing request.
        // Paths should be stored securely in environment variables.
        const httpsAgent = new https.Agent({
            key: fs.readFileSync("/etc/ssl/bulk-logistics/bulk-logistics-client.key"),
            cert: fs.readFileSync("/etc/ssl/bulk-logistics/bulk-logistics-client.crt"),
            ca: allCAs,
            rejectUnauthorized: true, // Ensure we only talk to services we trust
        });

        this.client = axios.create({
            baseURL: baseURL,
            httpsAgent: httpsAgent,
        });

        // --- Standardized Error Handling ---
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error(`Error from ${this.serviceName} API:`, error.response.data);
                    // Create a standardized error to be handled by our global error handler
                    throw new AppError(
                        `Request to ${this.serviceName} failed with status ${error.response.status}`,
                        502, // 502 Bad Gateway is appropriate for downstream errors
                    );
                } else if (error.request) {
                    // The request was made but no response was received (e.g., network error)
                    console.error(`No response from ${this.serviceName} API:`, error.message);
                    throw new AppError(`Could not connect to ${this.serviceName} service.`, 503); // 503 Service Unavailable
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error("Axios setup error:", error.message);
                    throw new AppError("An internal error occurred while preparing an external request.", 500);
                }
            },
        );
    }
}
