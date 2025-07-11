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

        const customCa = fs.readFileSync(process.env.MTLS_CA_CERT_PATH!);

        const allCAs = [...tls.rootCertificates, customCa];

        // const httpsAgent = new https.Agent({
        //     key: fs.readFileSync("/etc/ssl/bulk-logistics/bulk-logistics-client.key"),
        //     cert: fs.readFileSync("/etc/ssl/bulk-logistics/bulk-logistics-client.crt"),
        //     ca: allCAs,
        //     rejectUnauthorized: true,
        // });
        const httpsAgent = new https.Agent({
            key: fs.readFileSync(process.env.MTLS_PRIVATE_KEY_PATH!),
            cert: fs.readFileSync(process.env.MTLS_PUBLIC_CERT_PATH!),
            ca: allCAs,
            rejectUnauthorized: true, // Ensure we only talk to services we trust
        });

        this.client = axios.create({
            baseURL: baseURL,
            httpsAgent: httpsAgent,
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response) {
                    console.error(`Error from ${this.serviceName} API:`, error.response.data);
                    throw new AppError(
                        `Request to ${this.serviceName} failed with status ${error.response.status}`,
                        502,
                    );
                } else if (error.request) {
                    console.error(`No response from ${this.serviceName} API:`, error.message);
                    throw new AppError(`Could not connect to ${this.serviceName} service.`, 503);
                } else {
                    console.error("Axios setup error:", error.message);
                    throw new AppError("An internal error occurred while preparing an external request.", 500);
                }
            },
        );
    }
}
