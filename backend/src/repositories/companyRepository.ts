import database from "../config/database";

export const insertCompany = async (companyName: string, certificate_identifier: string, bank_account_number: string) => {
    const query = "INSERT INTO company (company_name, certificate_identifier, bank_account_number) VALUES ($1, $2, $3) RETURNING *";
    const values = [companyName, certificate_identifier];
    const result = await database.query(query, values);
    return result.rows[0];
};

export const getCertificateByCompanyName = async (companyName: string) => {
    const query = "SELECT certificate_identifier FROM company WHERE company_name = $1";
    const values = [companyName];
    const result = await database.query(query, values);
    return result.rows[0]?.certificate_identifier || null;
};
