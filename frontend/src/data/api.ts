import { APIError } from "../exceptions/api_error";
interface PostProps {
    payload: object;
    headers?: object;
}

export default class API {
    private static apiRoot: string | undefined;

    private static async pingAPI(): Promise<void> {
        const apiRoot = "https://bulk-logistics.projects.bbdgrad.com";

        const response = await fetch(apiRoot + "/api/health", { method: "GET" });
        const { status } = response;

        if (status >= 200 || status <= 600) {
            API.apiRoot = apiRoot;
        } else {
            API.apiRoot = undefined;
        }

        if (!API.apiRoot) {
            throw new APIError("Network error or server unreachable", status);
        }
    }

    private static async normaliseEndpoint(endpoint: string): Promise<string> {
        await API.pingAPI();

        if (endpoint.startsWith("/")) {
            endpoint = endpoint.substring(1);
        }
        if (!endpoint.startsWith("api/")) {
            endpoint = `api/${endpoint}`;
        }

        return endpoint;
    }

    public static async post(endpoint: string, data: PostProps) {
        const cleanEndpoint = await API.normaliseEndpoint(endpoint);
        const response = await fetch(`${API.apiRoot}/${cleanEndpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...data.headers,
            },
            body: JSON.stringify(data.payload),
        });

        if (!response.ok) {
            throw new APIError(`API responded with status ${response.status}`, response.status);
        }

        return await response;
    }

    public static async put(endpoint: string, data: PostProps) {
        const cleanEndpoint = await API.normaliseEndpoint(endpoint);
        const response = await fetch(`${API.apiRoot}/${cleanEndpoint}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...data.headers,
            },
            body: JSON.stringify(data.payload),
        });

        if (!response.ok) {
            throw new APIError(`API responded with status ${response.status}`, response.status);
        }

        return await response;
    }

    public static async get(endpoint: string) {
        const cleanEndpoint = await API.normaliseEndpoint(endpoint);
        const response = await fetch(`${API.apiRoot}/${cleanEndpoint}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new APIError(`API responded with status ${response.status}`, response.status);
        }

        return await response;
    }
    public static async delete(endpoint: string) {
        const cleanEndpoint = await API.normaliseEndpoint(endpoint);
        const response = await fetch(`${API.apiRoot}/${cleanEndpoint}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new APIError(`API responded with status ${response.status}`, response.status);
        }

        return await response;
    }
}
