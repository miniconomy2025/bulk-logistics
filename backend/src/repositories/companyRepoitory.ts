import database from "../config/database";

export const insertCompany = async (companyName: string, apiKey: string) => {
    const query = "INSERT INTO company (company_name, api_key) VALUES ($1, $2) RETURNING *";
    const values = [companyName, apiKey];
    const result = await database.query(query, values);
    return result.rows[0];
};

export const getApiKeyByCompanyName = async (companyName: string) => {
    const query = "SELECT api_key FROM company WHERE company_name = $1";
    const values = [companyName];
    const result = await database.query(query, values);
    return result.rows[0]?.api_key || null;
};
