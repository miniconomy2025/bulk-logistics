/**
 * Formats a date string (YYYY-MM-DD) into "DD Month YYYY".
 * @param date - The date string to format.
 * @returns The formatted date string.
 */
export function formatDate(date: string): string {
    const dateParts = date.split("-");
    const day = String(dateParts[2]).padStart(2, "0");
    const monthName = new Date(date).toLocaleString("default", { month: "long" });
    const year = dateParts[0];
    return `${day} ${monthName} ${year}`;
}
