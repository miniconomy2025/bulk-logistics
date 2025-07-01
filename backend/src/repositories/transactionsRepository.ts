import db from "../config/database";
import { Result } from "../types";

export const findTransactions = async (): Promise<Result<any>> => {
    const query = `
          SELECT
            t.transaction_ledger_id,
            t.commercial_bank_transaction_id,
            t.amount,
            t.transaction_date,
            ts.status AS transaction_status,
            tc.name AS category
          FROM
            bank_transactions_ledger t
          JOIN transaction_status ts ON t.transaction_status_id = ts.transaction_status_id
          JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
          ORDER BY t.transaction_date DESC
          LIMIT 100;
        `;
    try {
        const result = await db.query(query);
        return { ok: true, value: result.rows };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const findTransactionById = async (id: string): Promise<Result<any>> => {
    const query = `
    SELECT
      t.transaction_ledger_id,
      t.commercial_bank_transaction_id,
      t.amount,
      t.transaction_date,
      ts.status AS transaction_status,
      tc.name AS category,
      t.related_pickup_request_id,
      pr.original_external_order_id
    FROM
      bank_transactions_ledger t
    JOIN transaction_status ts ON t.transaction_status_id = ts.transaction_status_id
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
    LEFT JOIN pickup_requests pr ON t.related_pickup_request_id = pr.pickup_request_id
    WHERE t.transaction_ledger_id = $1;
    `;

    try {
        const result = await db.query(query, [id]);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

interface InsertIntoTransactionLedgerParams {
    commercial_bank_transaction_id: string;
    payment_reference_id: string;
    transaction_category_id: string;
    amount: string;
    transaction_date: string;
    transaction_status_id: string;
    related_pickup_request_id: string;
    related_loan_id: string;
    related_thoh_order_id: string;
}

export const insertIntoTransactionLedger = async (options: InsertIntoTransactionLedgerParams): Promise<Result<any>> => {
    const query = `
  INSERT INTO bank_transactions_ledger
    (
      commercial_bank_transaction_id,
      payment_reference_id,
      transaction_category_id,
      amount,
      transaction_date,
      transaction_status_id,
      related_pickup_request_id,
      related_loan_id,
      related_thoh_order_id
    )
  VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
  `;

    try {
        const result = await db.query(query, [
            options.commercial_bank_transaction_id,
            options.payment_reference_id,
            options.transaction_category_id,
            options.amount,
            options.transaction_date,
            options.transaction_status_id,
            options.related_pickup_request_id,
            options.related_loan_id,
            options.related_thoh_order_id,
        ]);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getTotals = async (): Promise<Result<any>> => {
    const query = `
    SELECT
      COALESCE(SUM(CASE WHEN tc.name = 'Revenue' THEN amount END),0) AS total_revenue,
      COALESCE(SUM(CASE WHEN tc.name = 'Expense' THEN amount END),0) AS total_expenses
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getActiveShipmentsCount = async (): Promise<Result<any>> => {
    const query = `
    SELECT COUNT(*) AS count
    FROM shipments s
    JOIN shipment_status st ON s.shipment_status_id = st.shipment_status_id
    WHERE st.name = 'Active';
  `;
    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getMonthlyRevenueExpenses = async (): Promise<Result<any>> => {
    const query = `
    SELECT
      EXTRACT(YEAR FROM transaction_date) AS year,
      EXTRACT(MONTH FROM transaction_date) AS month,
      SUM(CASE WHEN tc.name = 'Revenue' THEN amount END) AS revenue,
      SUM(CASE WHEN tc.name = 'Expense' THEN amount END) AS expenses
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
    WHERE transaction_date >= (current_date - INTERVAL '12 month')
    GROUP BY year, month
    ORDER BY year DESC, month DESC;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getTransactionBreakdown = async (): Promise<Result<any>> => {
    const query = `
    SELECT tc.name AS category, SUM(amount) AS total
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
    GROUP BY tc.name;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getTopRevenueSources = async (): Promise<Result<any>> => {
    const query = `
    SELECT c.company_name AS company,
           SUM(t.amount) AS total,
           COUNT(DISTINCT t.related_pickup_request_id) AS shipments
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
    JOIN pickup_requests pr ON t.related_pickup_request_id = pr.pickup_request_id
    JOIN company c ON pr.requesting_company_id = c.company_id
    WHERE tc.name = 'Revenue'
    GROUP BY c.company_name
    ORDER BY total DESC
    LIMIT 5;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};
