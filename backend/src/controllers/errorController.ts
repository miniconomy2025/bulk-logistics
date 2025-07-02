import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';

// Handles sending a detailed error response during development
const sendErrorDev = (err: any, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

// Handles sending a generic, user-friendly error response during production
const sendErrorProd = (err: AppError, res: Response) => {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } 
    // B) Programming or other unknown error: don't leak error details
    else {
        // 1) Log error to the console for the developer
        console.error('ERROR: ', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Set default status code and status if not already defined
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // NOTE: You can switch between 'development' and 'production'
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else { // 'production'
        let error = Object.assign(err, {});
        sendErrorProd(error, res);
    }
};

export default globalErrorHandler;