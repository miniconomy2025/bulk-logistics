import express from "express";
import companyRoutes from "./routes/companyRoutes";
import TransactionsController from "./controllers/transactionsController";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/api/transactions", TransactionsController.routes());
app.use("/api/company", companyRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
