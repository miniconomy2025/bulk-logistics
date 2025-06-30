import { Router, Request, Response } from "express";
import { RateLimitRequestHandler } from "express-rate-limit";

import { rateLimiter } from "../utils";
import {
  findTransactionById,
  findTransactions,
  insertIntoTransactionLedger,
} from "../repositories/transactionsRepository";

class TransactionsController {
  public router: Router;
  private rateLimit: RateLimitRequestHandler;

  constructor() {
    this.router = Router();
    this.rateLimit = rateLimiter({ message: "Too many requests." });
    this.setRoutes();
  }

  public static routes(): Router {
    return new TransactionsController().router;
  }

  public async getTransactions(_: Request, response: Response): Promise<void> {
    const result = await findTransactions();

    if (result.ok) {
      response.status(200).json({ transactions: result.value });
    } else {
      console.error(result.error);
      response.status(500).json({ message: "Internal server error." });
    }
  }

  public async getTransactionById(
    request: Request,
    response: Response
  ): Promise<void> {
    const { id } = request.params;
    const result = await findTransactionById(id);

    if (!result.ok) {
      console.error(result.error);
      response.status(500).json({ message: "Internal server error." });
      return;
    }

    if (result.value.rowCount === 0) {
      response.status(404).json({ error: "Transaction not found." });
      return;
    }

    response.status(200).json({ transaction: result.value.rows[0] });
  }

  public async createTransaction(
    request: Request,
    response: Response
  ): Promise<void> {
    const {
      commercial_bank_transaction_id,
      payment_reference_id,
      transaction_category_id,
      amount,
      transaction_date,
      transaction_status_id,
      related_pickup_request_id,
      related_loan_id,
      related_thoh_order_id,
    } = request.body;

    const result = await insertIntoTransactionLedger({
      commercial_bank_transaction_id,
      payment_reference_id,
      transaction_category_id,
      amount,
      transaction_date,
      transaction_status_id,
      related_pickup_request_id,
      related_loan_id,
      related_thoh_order_id,
    });

    if (result.ok) {
      response.status(201).json({ transaction: result.value.rows[0] });
    } else {
      console.error(result.error);
      response.status(500).json({ error: "Internal Server Error" });
    }
  }

  private setRoutes(): void {
    this.router.get("/", this.rateLimit, this.getTransactions.bind(this));
    this.router.get("/:id", this.rateLimit, this.getTransactionById.bind(this));
    this.router.post("/", this.rateLimit, this.createTransaction.bind(this));
  }
}

export default TransactionsController;
