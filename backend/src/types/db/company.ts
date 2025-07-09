export interface CompanyEntity {
    company_id: number;
    company_name: string;
    certificate_identifier: string;
    bank_account_number?: string | null;
}
