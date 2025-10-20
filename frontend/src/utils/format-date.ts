function isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Formats a date string (YYYY-MM-DD) into "DD Month YYYY".
 * @param date - The date string to format.
 * @returns The formatted date string.
 */
export function formatDate(date: string): string {
    const dateParts = date.split("-");
    const day = String(dateParts[2]).padStart(2, "0");
    const date_ = new Date(date)

    if (!isValidDate(date_)) {
        throw new Error("Invalid date provided. Please enter a valid date format.");
    }
    
    const monthName = date_.toLocaleString("default", { month: "long" });
    const year = dateParts[0];
    return `${day} ${monthName} ${year}`;
}
