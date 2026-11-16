import type { QueryResultRow } from "pg";
import type { LoanStatus, Summary } from "@/lib/types";
import { query } from "@/lib/server/db";

type Row<T> = T & QueryResultRow;

/** Returns exactly `Summary`. Overdue is counted from due_date for still-active loans, not just a stored 'late' status. */
export async function getSummary(): Promise<Summary> {
  const [totals, byCategory, statuses] = await Promise.all([
    query<Row<{ tools_available: string; tools_total: string; total_fine: string; active_users: string }>>(
      `SELECT (SELECT COALESCE(sum(available), 0) FROM tools WHERE active) AS tools_available,
              (SELECT COALESCE(sum(stock), 0) FROM tools WHERE active) AS tools_total,
              (SELECT COALESCE(sum(fine), 0) FROM loan_returns) AS total_fine,
              (SELECT count(*) FROM users WHERE active) AS active_users`,
    ),
    query<Row<{ category: string; kinds: number; stock: number; available: number }>>(
      `SELECT c.name AS category, count(t.id)::int AS kinds,
              COALESCE(sum(t.stock), 0)::int AS stock, COALESCE(sum(t.available), 0)::int AS available
         FROM categories c LEFT JOIN tools t ON t.category_id = c.id AND t.active
        GROUP BY c.id, c.name ORDER BY c.name`,
    ),
    query<Row<{ status: LoanStatus; total: number; overdue: number }>>(
      `SELECT status,
              count(*)::int AS total,
              count(*) FILTER (WHERE due_date < CURRENT_DATE)::int AS overdue
         FROM loans WHERE status IN ('pending', 'approved', 'borrowed', 'late') GROUP BY status`,
    ),
  ]);

  const count = (s: LoanStatus) => statuses.rows.find((r) => r.status === s)?.total ?? 0;
  const overdue = (s: LoanStatus) => statuses.rows.find((r) => r.status === s)?.overdue ?? 0;
  const t = totals.rows[0];

  return {
    toolsAvailable: Number(t.tools_available),
    toolsTotal: Number(t.tools_total),
    activeLoans: count("approved") + count("borrowed"),
    lateLoans: count("late") + overdue("approved") + overdue("borrowed"),
    pendingLoans: count("pending"),
    totalFine: Number(t.total_fine),
    activeUsers: Number(t.active_users),
    byCategory: byCategory.rows,
  };
}
