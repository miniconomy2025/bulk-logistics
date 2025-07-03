import express from "express";
import companyRoutes from "./routes/companyRoutes";
import transactionRoutes from "./routes/transactionRoutes";

import { init } from "express-oas-generator";

const app = express();

init(app, {})

const PORT = 3000;

app.use(express.json());

app.use("/api/transactions", transactionRoutes);
app.use("/api/company", companyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
