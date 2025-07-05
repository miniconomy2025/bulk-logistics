import express from "express";
import companyRoutes from "./routes/companyRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import pickupRequestRoutes from "./routes/pickupRequestRoutes";
import AppError from "./utils/errorHandlingMiddleware/appError";
import globalErrorHandler from "./utils/errorHandlingMiddleware/errorController";


const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/api/transactions", transactionRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/pickup-request", pickupRequestRoutes);
app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler); // error handler middleware.

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
