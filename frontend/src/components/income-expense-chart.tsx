import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import type { IncomeExpensesChartProps } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const IncomeExpensesChart = ({ transaction }: IncomeExpensesChartProps) => {
    const sortedData = [...transaction].sort((a, b) => {
        const dateA = new Date(parseInt(a.year), parseInt(a.month) - 1);
        const dateB = new Date(parseInt(b.year), parseInt(b.month) - 1);
        return dateA.getTime() - dateB.getTime();
    });

    const labels = sortedData.map((transaction) => {
        const date = new Date(parseInt(transaction.year), parseInt(transaction.month) - 1);
        return date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
    });

    const revenueData = sortedData.map((t) => t.revenue ?? 0);
    const expensesData = sortedData.map((t) => t.expenses ?? 0);

    const chartData = {
        labels,
        datasets: [
            {
                label: "Income",
                data: revenueData,
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.5)",
                tension: 0.3,
                fill: false,
            },
            {
                label: "Expenses",
                data: expensesData,
                borderColor: "rgb(255, 99, 132)",
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                tension: 0.3,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top" as const,
            },
            title: {
                display: true,
                text: "Income vs Expenses",
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.dataset.label || "";
                        const value = context.parsed.y;
                        return value === null ? `${label}: No data` : `${label}: Ð${value.toFixed(2)}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: any) => `Ð${value}`,
                },
            },
        },
    };

    return (
        <div className="h-full w-full">
            <Line
                data={chartData}
                options={options}
            />
        </div>
    );
};

export default IncomeExpensesChart;
