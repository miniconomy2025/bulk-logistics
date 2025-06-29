import express from "express";
import { createCompany, getApiKeyForCompany } from "../controllers/companyController";
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login/sign-up attempts. Please try again later.'
  }
});

const router = express.Router();
router.post('/signup', authLimiter, createCompany);
router.post('/login', authLimiter, getApiKeyForCompany);

export default router;