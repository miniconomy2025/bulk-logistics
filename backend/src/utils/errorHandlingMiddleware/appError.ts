class AppError extends Error {
    public statusCode: number;
    public status: "fail" | "error";
    public isOperational: boolean;

    /**
     * @param message The error message for the client.
     * @param statusCode The HTTP status code (e.g., 404, 400).
     */
    constructor(message: string, statusCode: number) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; // 400+ is failure, 500+ is error
        this.isOperational = true; // Mark this as an operational error that we created intentionally.

        // Capture the stack trace, excluding this constructor from it.
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
