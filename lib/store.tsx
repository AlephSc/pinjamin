"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Role = "admin" | "petugas" | "peminjam";
export type Status = "pending" | "approved" | "borrowed" | "late" | "returned" | "rejected";

export type Tool = { id: string; name: string; category: string; stock: number; available: number; condition: string };
export type Loan = {
  id: string; borrower: string; toolId: string; qty: number;
  borrowDate: string; dueDate: string; status: Status;
  returnedAt?: string; fine?: number; note?: string; purpose?: string;
};
export type User = { id: string; name: string; email: string; role: Role; active: boolean };
export type LogEntry = { id: string; at: string; actor: string; action: string; target: string };

export const TODAY = "2026-06-16";
export const FINE_PER_DAY = 2000;

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
export const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.ceil((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000));

const seedTools: Tool[] = [
  { id: "T01", name: "Kamera Canon EOS 250D", category: "Fotografi", stock: 6, available: 3, condition: "Baik" },
  { id: "T02", name: "Proyektor Epson EB-X06", category: "Presentasi", stock: 8, available: 5, condition: "Baik" },
  { id: "T03", name: "Tripod Takara A-125", category: "Fotografi", stock: 10, available: 9, condition: "Baik" },
  { id: "T04", name: "Mikrofon Behringer XM8500", category: "Audio", stock: 12, available: 6, condition: "Baik" },
  { id: "T05", name: "Speaker Aktif Yamaha DBR10", category: "Audio", stock: 4, available: 1, condition: "Perlu kalibrasi" },
  { id: "T06", name: "Laptop Asus VivoBook 14", category: "Komputer", stock: 15, available: 11, condition: "Baik" },
  { id: "T07", name: "Kabel HDMI 10m", category: "Presentasi", stock: 9, available: 4, condition: "Baik" },
  { id: "T08", name: "Tenda Lipat 3x3", category: "Umum", stock: 3, available: 1, condition: "Baik" }
];

const seedLoans: Loan[] = [
  { id: "PJ-0142", borrower: "Raka Pratama", toolId: "T01", qty: 1, borrowDate: "2026-06-16", dueDate: "2026-06-18", status: "pending", purpose: "Dokumentasi acara sekolah" },
  { id: "PJ-0141", borrower: "Nadia Putri", toolId: "T02", qty: 1, borrowDate: "2026-06-15", dueDate: "2026-06-17", status: "approved", purpose: "Presentasi kelas XII" },
  { id: "PJ-0140", borrower: "Fajar Hidayat", toolId: "T04", qty: 2, borrowDate: "2026-06-10", dueDate: "2026-06-13", status: "late", purpose: "Rekaman podcast" },
  { id: "PJ-0139", borrower: "Salsa Aulia", toolId: "T06", qty: 1, borrowDate: "2026-06-12", dueDate: "2026-06-14", status: "returned", returnedAt: "2026-06-14", fine: 0, purpose: "Lomba desain" },
  { id: "PJ-0138", borrower: "Bagas Nugroho", toolId: "T05", qty: 1, borrowDate: "2026-06-16", dueDate: "2026-06-20", status: "borrowed", purpose: "Latihan paduan suara" },
  { id: "PJ-0137", borrower: "Intan Sari", toolId: "T07", qty: 2, borrowDate: "2026-06-14", dueDate: "2026-06-16", status: "pending", purpose: "Rapat OSIS" }
];

const seedUsers: User[] = [
  { id: "U01", name: "Aleph Saputra", email: "aleph@sekolah.sch.id", role: "admin", active: true },
  { id: "U02", name: "Dewi Kartika", email: "dewi@sekolah.sch.id", role: "petugas", active: true },
  { id: "U03", name: "Raka Pratama", email: "raka@sekolah.sch.id", role: "peminjam", active: true },
  { id: "U04", name: "Intan Sari", email: "intan@sekolah.sch.id", role: "peminjam", active: false }
];

const seedLogs: LogEntry[] = [
  { id: "L1", at: "16 Jun 2026, 08:40", actor: "Raka Pratama", action: "Mengajukan peminjaman", target: "PJ-0142" },
  { id: "L2", at: "15 Jun 2026, 15:20", actor: "Dewi Kartika", action: "Menyetujui peminjaman", target: "PJ-0141" },
  { id: "L3", at: "14 Jun 2026, 10:05", actor: "Dewi Kartika", action: "Mengonfirmasi pengembalian", target: "PJ-0139" },
  { id: "L4", at: "14 Jun 2026, 09:12", actor: "Aleph Saputra", action: "Mengubah stok alat", target: "T05" }
];

type Store = {
  role: Role; setRole: (r: Role) => void;
  tools: Tool[]; loans: Loan[]; users: User[]; logs: LogEntry[];
  toolName: (id: string) => string;
  createLoan: (input: { borrower: string; toolId: string; qty: number; borrowDate: string; dueDate: string; purpose: string }) => void;
  decide: (id: string, status: Status, note?: string) => void;
  returnLoan: (id: string, returnedAt: string, fine: number, note: string) => void;
  addTool: (t: Omit<Tool, "id" | "available">) => void;
  restock: (id: string, delta: number) => void;
  toggleUser: (id: string) => void;
  addUser: (u: Omit<User, "id" | "active">) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [tools, setTools] = useState<Tool[]>(seedTools);
  const [loans, setLoans] = useState<Loan[]>(seedLoans);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [logs, setLogs] = useState<LogEntry[]>(seedLogs);

  const value = useMemo<Store>(() => {
    const log = (action: string, target: string) =>
      setLogs((l) => [{ id: "L" + (l.length + 1) + Date.now(), at: "Hari ini", actor: "Aleph Saputra", action, target }, ...l]);

    return {
      role, setRole, tools, loans, users, logs,
      toolName: (id) => tools.find((t) => t.id === id)?.name ?? id,
      createLoan: (input) => {
        const id = "PJ-" + (143 + loans.length - 6);
        setLoans((l) => [{ ...input, id, status: "pending" }, ...l]);
        log("Mengajukan peminjaman", id);
      },
      decide: (id, status, note) => {
        setLoans((l) =>
          l.map((loan) => {
            if (loan.id !== id) return loan;
            const next: Loan = { ...loan, status, note: note ?? loan.note };
            setTools((ts) =>
              ts.map((t) => {
                if (t.id !== loan.toolId) return t;
                // ponytail: stock moves assumed sequential (no concurrent approvals in demo)
                const delta = status === "approved" ? -loan.qty : 0;
                return { ...t, available: Math.max(0, Math.min(t.stock, t.available + delta)) };
              })
            );
            return next;
          })
        );
        log(status === "approved" ? "Menyetujui peminjaman" : "Menolak peminjaman", id);
      },
      returnLoan: (id, returnedAt, fine, note) => {
        setLoans((l) => l.map((loan) => (loan.id === id ? { ...loan, status: "returned", returnedAt, fine, note } : loan)));
        const loan = loans.find((x) => x.id === id);
        if (loan) setTools((ts) => ts.map((t) => (t.id === loan.toolId ? { ...t, available: Math.min(t.stock, t.available + loan.qty) } : t)));
        log("Mengonfirmasi pengembalian", id);
      },
      addTool: (t) => {
        const id = "T" + String(tools.length + 1).padStart(2, "0");
        setTools((ts) => [...ts, { ...t, id, available: t.stock }]);
        log("Menambah alat", id);
      },
      restock: (id, delta) => {
        setTools((ts) => ts.map((t) => (t.id === id ? { ...t, stock: Math.max(0, t.stock + delta), available: Math.max(0, t.available + delta) } : t)));
        log("Mengubah stok alat", id);
      },
      toggleUser: (id) => {
        setUsers((us) => us.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
        log("Mengubah status pengguna", id);
      },
      addUser: (u) => {
        const id = "U" + String(users.length + 1).padStart(2, "0");
        setUsers((us) => [...us, { ...u, id, active: true }]);
        log("Menambah pengguna", id);
      }
    };
  }, [role, tools, loans, users, logs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore harus dipakai di dalam StoreProvider");
  return store;
}
