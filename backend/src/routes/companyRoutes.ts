import express from "express";
import { createCompany, getCertificateIdentifierForCompany } from "../controllers/companyController";
import { rateLimiter } from "../utils";

const authLimiter = rateLimiter();

const router = express.Router();
router.post("/signup", authLimiter, createCompany);
router.post("/login", authLimiter, getCertificateIdentifierForCompany);

export default router;
