import crypto from "crypto";
import { Request, Response } from "express";
import { insertCompany, getCertificateByCompanyName } from "../repositories/companyRepository";

 
const computeCertificateFingerprint = (certificatePem: string): string => {
    const pem = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .replace(/\s+/g, "");
    const der = Buffer.from(pem, "base64");
    return crypto.createHash("sha256").update(der).digest("hex");
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        const { companyName, certificatePem, bankAccountNumber } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: "Company name is required." });
        }
        if (!certificatePem) {
            return res.status(400).json({ error: "certificatePem is required." });
        }
        const certificateIdentifier = computeCertificateFingerprint(certificatePem);

        const newCompany = await insertCompany(companyName, certificateIdentifier, bankAccountNumber);
        return res.status(201).json(newCompany);
    } catch (error) {
        console.error("Error creating company:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

export const getCertificateIdentifierForCompany = async (req: Request, res: Response) => {
    try {
        const { companyName } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: "Company name is required." });
        }

        const certificateIdentifier = await getCertificateByCompanyName(companyName);
        if (!certificateIdentifier) {
            return res.status(404).json({ error: "Company not found." });
        }

        return res.status(200).json({ certificateIdentifier });
    } catch (error) {
        console.error("Error fetching certificate identifier:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
