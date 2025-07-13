export function formatAsCurrencyStyle(amount: number = 0) {
    return new Intl.NumberFormat(undefined, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
