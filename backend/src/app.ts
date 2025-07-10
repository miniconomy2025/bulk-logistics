import express from "express";
import fs from "fs";
import https from "https";

import { init } from "express-oas-generator";

import bankRoutes from "./routes/bankNotification";
import companyRoutes from "./routes/companyRoutes";
import health from "./routes/health";
import pickupRequestRoutes from "./routes/pickupRequestRoutes";
import shipmentRoutes from "./routes/shipmentRoutes";
import thohRoutes from "./routes/thohRoutes";
import transactionRoutes from "./routes/transactionRoutes";

import AppError from "./utils/errorHandlingMiddleware/appError";
import globalErrorHandler from "./utils/errorHandlingMiddleware/errorController";

const app = express();

init(app, {
    info: {
        title: "Bulk Logistics API",
        version: "1.0.0",
        description: `The Bulk Logistics API enables the transfer of goods and machinery between suppliers and phone manufacturing companies within the simulated cellphone supply chain economy.

Bulk Logistics plays a critical role in ensuring the continuous flow of manufactured components—such as electronics screens, and cases from suppliers to phone companies (e.g Pear and SumSang). It may also handle delivery of equipment sourced from The Hand of Hḗphaistos, and Recycler to companies within the supply chain.

Key responsibilities include:
- Managing shipment orders between entities
- Tracking goods in transit
- Supporting logistics analytics and capacity planning
- Coordinating with manufacturing schedules and raw material supply
description: Production server`,
    },
});

const PORT = 443; // standard HTTPS port

app.use(express.json());

app.use("/api/health", health);
app.use("/api/bank", bankRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/pickup-request", pickupRequestRoutes);
app.use("/api/thoh", thohRoutes);
app.use("/api/shipments", shipmentRoutes);

app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler); // error handler middleware.

const options = {
  key: fs.readFileSync('/etc/ssl/bulk-logistics/bulk-logistics-server.key'),
  cert: fs.readFileSync('/etc/ssl/bulk-logistics/bulk-logistics-server.cert'),
  ca: fs.readFileSync('/etc/ssl/bulk-logistics/root-ca.crt'),
  requestCert: true,
  rejectUnauthorized: true,  // Enforce client certificate validation
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`Server running with mTLS on https://localhost:${PORT}`);
});
