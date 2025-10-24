import React from "react";

interface MockIncomeExpenseChartProps {
    transaction: any[];
}

const MockIncomeExpenseChart: React.FC<MockIncomeExpenseChartProps> = ({ transaction }) => {
    return <div data-testid="income-expense-chart">Chart with {transaction.length} data points</div>;
};

export default MockIncomeExpenseChart;
