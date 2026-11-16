"use client";

import { useMemo, useState } from "react";
import type { Category, Loan, LoanStatus, LogEntry, Role, SessionUser, Tool, User } from "@/lib/types";
import PinjaminWorkspace from "./PinjaminWorkspace";

const seedUsers: User[] = [
  { id: 1, name: "Aleph Saputra", email: "aleph@sekolah.sch.id", role: "admin", active: true },
  { id: 2, name: "Dewi Kartika", email: "dewi@sekolah.sch.id", role: "petugas", active: true },
  { id: 3, name: "Raka Pratama", email: "raka@sekolah.sch.id", role: "peminjam", active: true },
  { id: 4, name: "Intan Sari", email: "intan@sekolah.sch.id", role: "peminjam", active: false }
];
const seedTools: Tool[] = [
  { id: 1, code: "ALT-001", name: "Kamera Canon EOS 250D", categoryId: 1, category: "Fotografi", stock: 6, available: 3, condition: "Baik", active: true },
  { id: 2, code: "ALT-002", name: "Proyektor Epson EB-X06", categoryId: 2, category: "Presentasi", stock: 8, available: 5, condition: "Baik", active: true },
  { id: 3, code: "ALT-003", name: "Tripod Takara A-125", categoryId: 1, category: "Fotografi", stock: 10, available: 9, condition: "Baik", active: true },
  { id: 4, code: "ALT-004", name: "Mikrofon Behringer XM8500", categoryId: 3, category: "Audio", stock: 12, available: 6, condition: "Baik", active: true },
  { id: 5, code: "ALT-005", name: "Speaker Aktif Yamaha DBR10", categoryId: 3, category: "Audio", stock: 4, available: 1, condition: "Perlu kalibrasi", active: true },
  { id: 6, code: "ALT-006", name: "Laptop Asus VivoBook 14", categoryId: 4, category: "Komputer", stock: 15, available: 11, condition: "Baik", active: true }
];
const seedLoans: Loan[] = [
  { id: 142, code: "PJ-0142", borrowerId: 3, borrower: "Raka Pratama", toolId: 1, tool: "Kamera Canon EOS 250D", qty: 1, borrowDate: "2026-06-16", dueDate: "2026-06-18", status: "pending", purpose: "Dokumentasi acara sekolah", note: null, createdAt: "2026-06-16" },
  { id: 141, code: "PJ-0141", borrowerId: 4, borrower: "Intan Sari", toolId: 2, tool: "Proyektor Epson EB-X06", qty: 1, borrowDate: "2026-06-15", dueDate: "2026-06-17", status: "approved", purpose: "Presentasi kelas XII", note: null, createdAt: "2026-06-15" },
  { id: 140, code: "PJ-0140", borrowerId: 3, borrower: "Raka Pratama", toolId: 4, tool: "Mikrofon Behringer XM8500", qty: 2, borrowDate: "2026-06-10", dueDate: "2026-06-13", status: "late", purpose: "Rekaman podcast", note: null, createdAt: "2026-06-10" },
  { id: 139, code: "PJ-0139", borrowerId: 3, borrower: "Raka Pratama", toolId: 6, tool: "Laptop Asus VivoBook 14", qty: 1, borrowDate: "2026-06-12", dueDate: "2026-06-14", status: "returned", purpose: "Lomba desain", note: null, createdAt: "2026-06-12" }
];
const seedLogs: LogEntry[] = [
  { id: 1, at: "16 Jun 2026, 08:40", actor: "Raka Pratama", action: "Mengajukan peminjaman", target: "PJ-0142" },
  { id: 2, at: "15 Jun 2026, 15:20", actor: "Dewi Kartika", action: "Menyetujui peminjaman", target: "PJ-0141" },
  { id: 3, at: "14 Jun 2026, 10:05", actor: "Dewi Kartika", action: "Mengonfirmasi pengembalian", target: "PJ-0139" }
];

const categoriesOf = (tools: Tool[]): Category[] =>
  Array.from(new Map(tools.map((tool) => [tool.categoryId, tool.category])).entries()).map(([id, name]) => {
    const items = tools.filter((tool) => tool.categoryId === id);
    return { id, name, kinds: items.length, available: items.reduce((sum, tool) => sum + tool.available, 0) };
  });

export default function PinjaminDemo() {
  const [tools, setTools] = useState<Tool[]>(seedTools);
  const [loans, setLoans] = useState<Loan[]>(seedLoans);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [logs, setLogs] = useState<LogEntry[]>(seedLogs);
  const [role, setRole] = useState<Role>("admin");
  const user = useMemo<SessionUser>(() => { const found = users.find((item) => item.role === role && item.active) ?? users[0]; return { id: found.id, name: found.name, email: found.email, role: found.role }; }, [users, role]);
  const categories = useMemo(() => categoriesOf(tools), [tools]);
  const today = () => new Date().toISOString().slice(0, 10);
  const log = (action: string, target: string) => setLogs((list) => [{ id: Date.now(), at: new Date().toLocaleString("id-ID"), actor: user.name, action, target }, ...list]);

  return <PinjaminWorkspace
    user={user}
    tools={tools}
    loans={loans}
    users={users}
    categories={categories}
    logs={logs}
    demoMode
    onDemoRoleChange={setRole}
    onCreateLoan={(input) => {
      const tool = tools.find((item) => item.id === input.toolId);
      if (!tool) throw new Error("Alat tidak ditemukan.");
      if (input.qty < 1 || input.qty > tool.available) throw new Error(`Stok tersedia hanya ${tool.available}.`);
      if (input.dueDate < today()) throw new Error("Tanggal kembali tidak boleh sebelum hari ini.");
      const code = `PJ-${143 + loans.length}`;
      setLoans((list) => [{ id: Date.now(), code, borrowerId: input.borrowerId, borrower: user.name, toolId: tool.id, tool: tool.name, qty: input.qty, borrowDate: today(), dueDate: input.dueDate, status: "pending", purpose: input.purpose, note: null, createdAt: today() }, ...list]);
      log("Mengajukan peminjaman", code);
    }}
    onDecideLoan={(loanId, status) => {
      const loan = loans.find((item) => item.id === loanId);
      if (!loan || loan.status !== "pending") throw new Error("Pengajuan sudah diproses.");
      const tool = tools.find((item) => item.id === loan.toolId);
      if (status === "approved" && (!tool || tool.available < loan.qty)) throw new Error("Stok tidak mencukupi.");
      setLoans((list) => list.map((item) => item.id === loanId ? { ...item, status } : item));
      if (status === "approved") setTools((items) => items.map((item) => item.id === loan.toolId ? { ...item, available: item.available - loan.qty } : item));
      log(status === "approved" ? "Menyetujui peminjaman" : "Menolak peminjaman", loan.code);
    }}
    onReturnLoan={(input) => {
      const loan = loans.find((item) => item.id === input.loanId);
      if (!loan) throw new Error("Peminjaman tidak ditemukan.");
      if (input.intent === "confirm" && !["approved", "borrowed", "late"].includes(loan.status)) throw new Error("Peminjaman sudah selesai.");
      setLoans((list) => list.map((item) => item.id === input.loanId ? { ...item, status: (input.intent === "confirm" ? "returned" : item.status) as LoanStatus, note: input.note || null } : item));
      if (input.intent === "confirm") setTools((items) => items.map((item) => item.id === loan.toolId ? { ...item, available: Math.min(item.stock, item.available + loan.qty) } : item));
      log(input.intent === "confirm" ? "Mengonfirmasi pengembalian" : "Mengajukan pengembalian", loan.code);
    }}
    onCreateTool={(input) => {
      if (tools.some((item) => item.code.toLowerCase() === input.code.toLowerCase())) throw new Error("Kode alat sudah dipakai.");
      const category = categories.find((item) => item.id === input.categoryId);
      setTools((list) => [...list, { ...input, id: Date.now(), category: category?.name ?? `Kategori ${input.categoryId}`, available: input.stock, active: true }]);
      log("Menambah alat", input.code);
    }}
    onCreateUser={(input) => {
      if (users.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email sudah terdaftar.");
      setUsers((list) => [...list, { ...input, id: Date.now(), active: true }]);
      log("Menambah pengguna", input.email);
    }}
  />;
}
