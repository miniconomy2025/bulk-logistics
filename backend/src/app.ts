import express from "express";
import companyRoutes from "./routes/companyRoutes";
import TransactionsController from "./controllers/transactionsController";
import pickupRequestRoutes from "./routes/pickupRequestRoutes"
import AppError from "./utils/appError";
import globalErrorHandler from "./controllers/errorController";

const app = express();
const PORT = 3000;

app.use(express.json());

// app.use("/api/transactions", TransactionsController.routes());
app.use("/api/company", companyRoutes);
app.use("/api/pickup-request", pickupRequestRoutes)
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
