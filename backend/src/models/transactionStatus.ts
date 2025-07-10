import db from "../config/database";
import type { TransactionStatus } from "../types";

export const getTransactionStatusByName = async (statusName: string): Promise<TransactionStatus | null> => {
    const query = `
    SELECT transaction_status_id FROM transaction_status WHERE status = $1;
  `;

    const result = await db.query(query, [statusName]);

    if (!result.rowCount) return null;

    return result.rows[0];
};
