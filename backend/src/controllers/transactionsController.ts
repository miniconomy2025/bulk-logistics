import { Router, Request, Response } from "express";
import { RateLimitRequestHandler } from "express-rate-limit";
import { rateLimiter } from "../utils";

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

  public getTransactions(request: Request, response: Response): void {
    response.statusCode == 200;
    response.json({ transactions: [1, 2, 3, 4, 5, 6] });
  }

  public getTransactionById(request: Request, response: Response): void {
    response.statusCode == 200;
    response.json({ transaction: { id: request.params.id, amount: 190 } });
  }

  public createTransaction(request: Request, response: Response): void {
    response.statusCode == 201;
    response.json({ message: "Created" });
  }

  private setRoutes(): void {
    this.router.get("/", this.rateLimit, this.getTransactions);
    this.router.get("/:id/", this.rateLimit, this.getTransactionById);
    this.router.post("/", this.rateLimit, this.createTransaction);
  }
}

export default TransactionsController;
