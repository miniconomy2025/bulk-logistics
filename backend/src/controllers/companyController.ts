import crypto from "crypto";

import { Request, Response } from "express";

import { insertCompany, getApiKeyByCompanyName } from "../models/companyRepository";


export const generateApiKey = (): string => {
    return crypto.randomBytes(32).toString("hex");
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        let { companyName, apiKey } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: "Company name is required." });
        }
        if (!apiKey) {
            apiKey = generateApiKey();
        }
        const newCompany = await insertCompany(companyName, apiKey);
        return res.status(201).json(newCompany);
    } catch (error) {
        console.error("Error creating company:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export const getApiKeyForCompany = async (req: Request, res: Response) => {
    try {
        const { companyName } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: "Company name is required." });
        }

        const apiKey = await getApiKeyByCompanyName(companyName);
        if (!apiKey) {
            return res.status(404).json({ error: "Company not found." });
        }

        return res.status(200).json({ apiKey });
    } catch (error) {
        console.error("Error fetching API key:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
