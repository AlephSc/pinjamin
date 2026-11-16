export type Role = "admin" | "petugas" | "peminjam";
export type LoanStatus = "pending" | "approved" | "rejected" | "borrowed" | "late" | "returned";

export type SessionUser = { id: number; name: string; email: string; role: Role };
export type Category = { id: number; name: string; kinds: number; available: number };
export type Tool = {
  id: number; code: string; name: string; categoryId: number; category: string;
  stock: number; available: number; condition: string; active: boolean;
};
export type User = { id: number; name: string; email: string; role: Role; active: boolean };
export type Loan = {
  id: number; code: string; borrowerId: number; borrower: string;
  toolId: number; tool: string; qty: number;
  borrowDate: string; dueDate: string; status: LoanStatus;
  purpose: string; note: string | null; createdAt: string;
};
export type LoanReturn = {
  loanId: number; returnedAt: string; condition: string; fine: number; note: string | null;
};
export type LogEntry = { id: number; at: string; actor: string; action: string; target: string };
export type Summary = {
  toolsAvailable: number; toolsTotal: number; activeLoans: number; lateLoans: number;
  pendingLoans: number; totalFine: number; activeUsers: number;
  byCategory: { category: string; kinds: number; stock: number; available: number }[];
};
export type ApiError = { error: { code: string; message: string } };
