import database from "../config/database";

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