export const formatDate = jest.fn((date: string) => {
    const dateParts = date.split("-");
    const day = String(dateParts[2]).padStart(2, "0");
    const monthName = new Date(date).toLocaleString("default", { month: "long" });
    const year = dateParts[0];
    return `${day} ${monthName} ${year}`;
});
