import { APIError } from "../exceptions/api_error";
interface PostProps {
    payload: object;
    headers?: object;
}

export default class API {
    private static apiRoot: string | undefined;

    private static async pingAPI(): Promise<void> {
        const apiRoot = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/health";

        const response = await fetch(apiRoot, { method: "GET" });
        const { status } = response;

        if (status >= 200 || status <= 600) {
            const isDev = import.meta.env.VITE_DEV === "dev";
            API.apiRoot = isDev ? apiRoot : "http://localhost:3000";
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
