import database from "../config/database";
import { Company } from "../types";

export const insertCompany = async (companyName: string, certificate_identifier: string, bank_account_number: string) => {
    const query = "INSERT INTO company (company_name, certificate_identifier, bank_account_number) VALUES ($1, $2, $3) RETURNING *";
    const result = await database.query(query, [companyName, certificate_identifier, bank_account_number]);
    return result.rows[0];
};

export const getCertificateByCompanyName = async (companyName: string) => {
    const query = "SELECT certificate_identifier FROM company WHERE company_name = $1";
    const result = await database.query(query, [companyName]);
    return result.rows[0]?.certificate_identifier || null;
};

export const findAccountNumberByCompanyName = async (companyName: string) => {
    const query = "SELECT bank_account_number FROM company WHERE company_name = $1";
    const result = await database.query(query, [companyName]);
    return result.rows[0]?.bank_account_number || null;
};

export const getCompanyByName = async (companyName: string): Promise<Company | null> => {
    const query = `
        SELECT 
            company_id,
            company_name,
            company_url,
            certificate_identifier,
            bank_account_number
        FROM company
        WHERE company_name = $1
    `;

    const result = await database.query(query, [companyName]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    const company: Company = {
        id: row.company_id,
        companyName: row.company_name,
        companyURL: row.company_url,
        certificateIdentifier: row.certificate_identifier ?? undefined,
        bankAccountNumber: row.bank_account_number ?? undefined,
    };

    return company;
};

export const updateCompanyDetails = async (
    companyName: string,
    details: {
        certificateIdentifier?: string | null;
        bankAccountNumber?: string | null;
    },
): Promise<Company | null> => {
    const query = `
        UPDATE company
        SET 
            certificate_identifier = COALESCE($1, certificate_identifier),
            bank_account_number = COALESCE($2, bank_account_number)
        WHERE 
            company_name = $3
        RETURNING *;
    `;

    // Pass the new details and the company name as parameters.
    // If a detail is not provided, its value will be 'undefined', which the pg driver converts to NULL.
    const values = [details.certificateIdentifier, details.bankAccountNumber, companyName];

    const result = await database.query(query, values);

    // If no rows are returned, it means no company with that name was found.
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Map the returned database row to your Company object.
    const company: Company = {
        id: row.company_id,
        companyName: row.company_name,
        companyURL: row.company_url,
        certificateIdentifier: row.certificate_identifier ?? undefined,
        bankAccountNumber: row.bank_account_number ?? undefined,
    };

    return company;
};
