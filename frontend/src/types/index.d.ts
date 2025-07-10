export interface NavItem {
    title: string;
    href: string;
    icon: React.JSX.IntrinsicElements.span;
    isActive?: boolean;
}

export type Transaction = {
    year: string;
    month: string;
    revenue: number | null;
    expenses: number | null;
};

export interface IncomeExpensesChartProps {
    transaction: Transaction[];
}

export interface RecentTransactionsItem {
    company: string;
    amount: string;
    transaction_type: string;
    transaction_date: string;
    pickup_request_id: number;
}