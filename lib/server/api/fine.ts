export function isReturnDateValid(returnedAt: string, borrowDate: string | Date, today = new Date().toISOString().slice(0, 10)): boolean {
  const start = borrowDate instanceof Date ? borrowDate.toISOString().slice(0, 10) : borrowDate.slice(0, 10);
  return returnedAt >= start && returnedAt <= today;
}

export function fineFor(returnedAt: string, dueDate: string): number {
  const lateDays = Math.max(0, Math.floor((Date.parse(`${returnedAt}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86_400_000));
  return lateDays * 2000;
}
