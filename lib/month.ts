// lib/month.ts
export function getMonthRange(monthStr?: string) {
  // monthStr format: "YYYY-MM"
  const now = new Date();
  const [y, m] = (monthStr ?? "").split("-").map(Number);

  const year = y && m ? y : now.getFullYear();
  const monthIndex = y && m ? m - 1 : now.getMonth(); // 0-based

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0); // exclusive

  const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { start, end, key };
}
