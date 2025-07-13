import db from "../config/database";
import { TransactionCategory, TransactionStatus } from "../enums";
import { BankNotificationPayload, Loan, Result, LoanInfoResponse } from "../types";
import { findAccountNumberByCompanyName } from "./companyRepository";
import { getTransactionStatusByName } from "./transactionStatusRepository";

export const findTransactions = async (): Promise<Result<any>> => {
    const query = `
         SELECT
          t.transaction_ledger_id,
          t.commercial_bank_transaction_id,
          t.amount,
          tc.money_direction,
          CASE 
            WHEN tc.money_direction = 'in' THEN t.amount 
            ELSE -t.amount 
          END AS signed_amount,
          t.transaction_date,
          ts.status AS transaction_status,
          tc.name AS category,
          COALESCE(c.company_name, 'N/A') AS company_name
        FROM bank_transactions_ledger t
        JOIN transaction_status ts 
          ON t.transaction_status_id = ts.transaction_status_id
        JOIN transaction_category tc 
          ON t.transaction_category_id = tc.transaction_category_id
        LEFT JOIN pickup_requests pr 
          ON t.related_pickup_request_id = pr.pickup_request_id
        LEFT JOIN company c 
          ON pr.requesting_company_id = c.company_id
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
    commercial_bank_transaction_id: string | null;
    payment_reference_id: string | null;
    transaction_category_id: number;
    amount: number;
    transaction_date: string;
    transaction_status_id: number;
    related_pickup_request_id: number | null;
    loan_id: number | null;
    related_thoh_order_id: string | null;
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
      loan_id,
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
            options.loan_id,
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
      SUM(CASE WHEN tc.name = 'PURCHASE' THEN amount END) AS purchase,
      SUM(CASE WHEN tc.name = 'EXPENSE' THEN amount END) AS expense,
      SUM(CASE WHEN tc.name = 'PAYMENT_RECEIVED' THEN amount END) AS payment_received,
      SUM(CASE WHEN tc.name = 'LOAN' THEN amount END) AS loan
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

export const getMonthlyRevenueExpenses = async (): Promise<Result<any>> => {
    const query = `
    SELECT
        EXTRACT(YEAR FROM transaction_date) AS year,
        EXTRACT(MONTH FROM transaction_date) AS month,
        SUM(CASE WHEN tc.name IN ('PURCHASE', 'EXPENSE', 'LOAN') THEN amount END) AS expenses,
        SUM(CASE WHEN tc.name IN ('PAYMENT_RECEIVED') THEN amount END) AS revenue
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
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

export const getRecentTransactionRepo = async (): Promise<Result<any>> => {
    const query = `
    SELECT 
        t.amount ,
        t.transaction_date ,
        tc.name AS transaction_type,
        c.company_name AS company,
        pr.pickup_request_id as pickup_request_id 
    FROM bank_transactions_ledger t
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id
    JOIN pickup_requests pr ON t.related_pickup_request_id = pr.pickup_request_id
    JOIN company c ON pr.requesting_company_id = c.company_id 
    ORDER BY t.transaction_date DESC
    LIMIT 7;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const getTopRevenueSourcesRepo = async (): Promise<Result<any>> => {
    const query = `
    SELECT 
        c.company_name AS company,
        SUM(t.amount) AS total,
        COUNT(DISTINCT t.related_pickup_request_id) AS shipments
    FROM bank_transactions_ledger t
    JOIN pickup_requests pr ON pr.pickup_request_id = t.related_pickup_request_id
    JOIN company c ON pr.requesting_company_id = c.company_id
    JOIN transaction_category tc ON t.transaction_category_id = tc.transaction_category_id where tc.name = 'PAYMENT_RECEIVED'
    GROUP BY c.company_name
    ORDER BY total DESC;
  `;

    try {
        const result = await db.query(query);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

const getCategoryId = async (direction: "in" | "out"): Promise<number> => {
    const result = await db.query(
        `
        SELECT 1 transaction_category_id FROM transaction_category WHERE name $1`,
        [direction],
    );
    return result.rows[0]?.transaction_category_id || null;
};

export const getCategoryIdByName = async (name: string): Promise<number> => {
    const result = await db.query(`SELECT  transaction_category_id FROM transaction_category WHERE name $1`, [name]);

    return result.rows[0]?.transaction_category_id;
};

const transactionExists = async (transactionNumber: string): Promise<boolean> => {
    const result = await db.query(
        `SELECT 1 FROM bank_transactions_ledger
   WHERE commercial_bank_transaction_id = $1`,
        [transactionNumber],
    );
    return new Promise((resolve, _) => {
        resolve(result.rowCount != null ? result.rowCount > 0 : false);
    });
};

const insertTransaction = async (
    t: BankNotificationPayload & { statusName: string; categoryId: number; transactionDate: Date },
): Promise<Result<any>> => {
    const query = `INSERT INTO bank_transactions_ledger (
     commercial_bank_transaction_id,
     transaction_category_id,
     amount,
     transaction_date,
     transaction_status_id
   )
   VALUES ($1, $2, $3, $4, (SELECT transaction_status_id FROM transaction_status WHERE status = $5))`;
    try {
        const result = await db.query(query, [t.transaction_number, t.categoryId, t.amount, t.transactionDate, t.statusName]);
        return { ok: true, value: result };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
};

export const createLedgerEntry = async (transaction: BankNotificationPayload & { statusName: string }) => {
    try {
        await db.query("BEGIN");

        const direction: "in" | "out" = transaction.to === (await findAccountNumberByCompanyName("bulk-logistics")) ? "in" : "out";

        const categoryId = await getCategoryId(direction);

        const transactionDate = new Date(transaction.timestamp * 1000);

        if (await transactionExists(transaction.transaction_number)) {
            await db.query("ROLLBACK");
            return 409;
        }

        await insertTransaction({
            ...transaction,
            categoryId,
            transactionDate,
        });

        await db.query("COMMIT");
        return 201;
    } catch (error) {
        await db.query("ROLLBACK");
        console.error("Transaction processing error:", error);
        return 500;
    }
};

export const getAllLoans = async (): Promise<Loan[]> => {
    const result = await db.query(`SELECT * FROM loans`);

    if (!result || result.rows.length < 1) {
        return [];
    }

    return result.rows.map((loan) => ({
        id: loan.loan_id,
        loanAmount: loan.loan_amount,
        interestRate: loan.interest_rate,
        loanNumber: loan.loan_number,
    }));
};

export const updatePaymentStatusForPickupRequest = async (transaction: BankNotificationPayload): Promise<number | null> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transaction.description);

    const paymentReferenceId = isUuid ? transaction.description : null;
    const pickupRequestId = !isUuid ? parseInt(transaction.description, 10) : null;

    const query = `
        UPDATE bank_transactions_ledger
        SET 
            transaction_status_id = (
                SELECT transaction_status_id 
                FROM transaction_status 
                WHERE status = 'COMPLETED'
            )
        WHERE 
            payment_reference_id = $1 
            OR related_pickup_request_id = $2;
    `;

    const result = await db.query(query, [paymentReferenceId, pickupRequestId]);

    return result.rowCount;
};

export const saveLoanDetails = async (loanDetails: Partial<LoanInfoResponse>, commercialBankTransactionId: string): Promise<Result<any>> => {
    try {
        await db.query("BEGIN");

        const loanQuery = `
            INSERT INTO loans (
                loan_number,
                interest_rate,
                loan_amount
            ) VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const loanResult = await db.query(loanQuery, [loanDetails.loan_number, loanDetails.interest_rate, loanDetails.initial_amount]);
        const loanId = loanResult.rows[0].loan_id;
        const transactionStatus = loanDetails.success ? TransactionStatus.Completed : TransactionStatus.Failed;

        const status = await getTransactionStatusByName(transactionStatus);

        const transactionCategoryId = await getCategoryIdByName(TransactionCategory.Loan);

        await insertIntoTransactionLedger({
            commercial_bank_transaction_id: commercialBankTransactionId,
            payment_reference_id: null,
            transaction_category_id: transactionCategoryId,
            amount: loanDetails.initial_amount || 0,
            transaction_date: new Date().toISOString().split("T")[0],
            transaction_status_id: status?.transaction_status_id!,
            related_pickup_request_id: null,
            loan_id: loanId,
            related_thoh_order_id: null,
        });

        await db.query("COMMIT");
        return { ok: true, value: loanResult.rows[0] };
    } catch (error) {
        await db.query("ROLLBACK");
        return { ok: false, error: error as Error };
    }
};
