import express from "express";
import {
  createCompany,
  getApiKeyForCompany,
} from "../controllers/companyController";
import { rateLimiter } from "../utils";

const authLimiter = rateLimiter();

const router = express.Router();
router.post("/signup", authLimiter, createCompany);
router.post("/login", authLimiter, getApiKeyForCompany);

export default router;
