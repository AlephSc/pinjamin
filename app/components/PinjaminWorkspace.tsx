"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight, Boxes, Check, ClipboardList, FileBarChart, LayoutDashboard,
  LogOut, PackageCheck, Plus, Search, ShieldCheck, Tags, Trash2, Users,
  X, AlertCircle, Pencil, RotateCcw,
} from "lucide-react";
import type { Category, Loan, LoanStatus, LogEntry, Role, SessionUser, Tool, User } from "@/lib/types";
import styles from "./PinjaminWorkspace.module.css";

type View = "dashboard" | "loans" | "returns" | "inventory" | "categories" | "users" | "reports" | "logs";
type LoanInput = { borrowerId: number; toolId: number; qty: number; dueDate: string; purpose: string };
type ReturnInput = { loanId: number; returnedAt: string; condition: string; note: string; intent: "request" | "confirm" };
type ToolInput = { name: string; categoryId: number; stock: number; condition: string; code: string };
type ToolUpdateInput = { id: number; name: string; categoryId: number; stock: number; condition: string; code: string };
type UserInput = { name: string; email: string; role: Role; password: string };
type Action<T> = (input: T) => void | Promise<void | boolean>;
type ReturnAction = Action<ReturnInput>;
type AsyncAction = () => void | Promise<void | boolean>;

export type PinjaminWorkspaceProps = {
  user: SessionUser;
  tools: Tool[];
  loans: Loan[];
  users: User[];
  categories?: Category[];
  logs?: LogEntry[];
  demoMode?: boolean;
  onDemoRoleChange?: (role: Role) => void;
  roleSwitcherMode?: "select" | "links";
  onCreateLoan: Action<LoanInput>;
  onDecideLoan: (loanId: number, status: Extract<LoanStatus, "approved" | "rejected">) => void | Promise<void>;
  onReturnLoan: ReturnAction;
  onCreateTool: Action<ToolInput>;
  onUpdateTool: Action<ToolUpdateInput>;
  onDeleteTool: (toolId: number) => void | Promise<void>;
  onCreateUser: Action<UserInput>;
  onCreateCategory: Action<{ name: string }>;
  onDeleteCategory: (categoryId: number) => void | Promise<void>;
};

const labels: Record<View, string> = { dashboard: "Ringkasan", loans: "Peminjaman", returns: "Pengembalian", inventory: "Alat", categories: "Kategori", users: "Pengguna", reports: "Laporan", logs: "Log aktivitas" };
const statusText: Record<LoanStatus, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", borrowed: "Dipinjam", late: "Terlambat", returned: "Dikembalikan" };
const activeStatuses: LoanStatus[] = ["approved", "borrowed", "late"];
const navByRole: Record<Role, View[]> = {
  admin: ["dashboard", "loans", "returns", "inventory", "categories", "users", "reports", "logs"],
  petugas: ["dashboard", "loans", "returns", "inventory", "reports"],
  peminjam: ["dashboard", "inventory", "loans", "returns"]
};
const navIcons: Record<View, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, loans: ClipboardList, returns: PackageCheck, inventory: Boxes,
  categories: Tags, users: Users, reports: FileBarChart, logs: ShieldCheck,
};
const roleLabel: Record<Role, string> = { admin: "Administrator", petugas: "Petugas", peminjam: "Peminjam" };
const dateToday = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function PinjaminWorkspace(props: PinjaminWorkspaceProps) {
  const router = useRouter();
  const [logs, setLogs] = useState(props.logs ?? []);
  const [users, setUsers] = useState(props.users);
  const [loans, setLoans] = useState(props.loans);
  const [tools, setTools] = useState(props.tools);
  const [categories, setCategories] = useState(props.categories ?? []);
  useEffect(() => { setLogs(props.logs ?? []); setUsers(props.users); setLoans(props.loans); setTools(props.tools); setCategories(props.categories ?? []); }, [props.logs, props.users, props.loans, props.tools, props.categories]);
  const { user } = props;
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "tool" | "category"; id: number; name: string } | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const nav = navByRole[user.role];
  const current = nav.includes(view) ? view : nav[0];
  const mine = user.role !== "peminjam" ? loans : loans.filter((loan) => loan.borrowerId === user.id);
  const match = (text: string) => text.toLowerCase().includes(query.toLowerCase());
  const visibleLoans = mine.filter((loan) => match(`${loan.code} ${loan.borrower} ${loan.tool}`));
  const visibleTools = tools.filter((tool) => tool.active && match(`${tool.name} ${tool.code} ${tool.category}`));
  const visibleUsers = users.filter((item) => match(`${item.name} ${item.email} ${item.role}`));
  const visibleCategories = categories.filter((category) => match(category.name));
  const activeLoans = visibleLoans.filter((loan) => activeStatuses.includes(loan.status));
  const pendingCount = mine.filter((loan) => loan.status === "pending").length;
  const returnCount = mine.filter((loan) => loan.returnRequested).length;
  const totalStock = tools.reduce((sum, tool) => sum + tool.stock, 0);
  const availableStock = tools.reduce((sum, tool) => sum + tool.available, 0);

  async function run(action: AsyncAction, success: string): Promise<boolean> {
    setBusy(true); setError(""); setMessage("");
    try { if (await action() === false) return false; setMessage(success); setShowForm(false); setEditingTool(null); setConfirmDelete(null); router.refresh(); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Perubahan gagal. Coba lagi."); return false; }
    finally { setBusy(false); }
  }

  function changeView(next: View) {
    setView(next); setQuery(""); setShowForm(false); setEditingTool(null);
    setConfirmDelete(null); setError(""); setMessage("");
  }

  async function logout() {
    setLogoutBusy(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "fetch" } });
      if (!response.ok) throw new Error("Gagal keluar dari sesi.");
      router.replace("/masuk"); router.refresh();
    } catch (reason) {
      setLogoutError(reason instanceof Error ? reason.message : "Gagal keluar dari sesi.");
    } finally { setLogoutBusy(false); }
  }

  return <main className={styles.workspace}>
    <aside className={styles.rail} aria-label="Navigasi utama">
      <a className={styles.brand} href="#workspace" aria-label="Pinjamin, ke ruang kerja">
        <span className={styles.brandMark} aria-hidden="true">P</span><span>Pinjamin</span>
      </a>
      <p className={styles.railLabel}>Ruang kerja</p>
      <nav className={styles.nav} aria-label="Modul Pinjamin">
        {nav.map((item) => {
          const Icon = navIcons[item];
          const count = item === "loans" && user.role !== "peminjam" ? pendingCount
            : item === "returns" && user.role !== "peminjam" ? returnCount : 0;
          return <button key={item} type="button" className={`${styles.navItem} ${current === item ? styles.selected : ""}`}
            aria-current={current === item ? "page" : undefined} onClick={() => changeView(item)}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{labels[item]}</span>
            {count > 0 && <span className={styles.navCount}>{count}</span>}
          </button>;
        })}
      </nav>
      <div className={styles.railBottom}>
        <div className={styles.profile}>
          <span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>{roleLabel[user.role]}</small></div>
        </div>
        <button type="button" className={styles.logoutButton} onClick={() => void logout()} disabled={logoutBusy}>
          <LogOut size={16} aria-hidden="true" />{logoutBusy ? "Keluar…" : "Keluar"}
        </button>
        {logoutError && <p className={styles.railError} role="alert">{logoutError}</p>}
      </div>
    </aside>
    <div className={styles.main} id="workspace">
      <header className={styles.topbar}>
        <div className={styles.topContext}>
          <span className={styles.role}>{roleLabel[user.role]}</span>
          {props.demoMode && <span className={styles.demo}>Data demo · tanpa autentikasi</span>}
        </div>
        {props.demoMode && (
          props.roleSwitcherMode === "links" ? <div className={styles.demoRole} aria-label="Ganti peran demo">
            <a href="/" className={user.role === "peminjam" ? styles.selected : ""}>Peminjam</a>
            <a href="/petugas" className={user.role === "petugas" ? styles.selected : ""}>Petugas</a>
            <a href="/admin" className={user.role === "admin" ? styles.selected : ""}>Admin</a>
          </div> : <label className={styles.demoRole}>Tampilan demo
            <select aria-label="Ganti peran demo" value={user.role} onChange={(event) => {
              props.onDemoRoleChange?.(event.target.value as Role); changeView("dashboard");
            }}>
              <option value="admin">Admin</option><option value="petugas">Petugas</option><option value="peminjam">Peminjam</option>
            </select>
          </label>
        )}
      </header>
      <section className={styles.content} aria-labelledby="view-title">
        <div className={styles.heading}>
          <div><h1 id="view-title">{labels[current]}</h1><p className={styles.muted}>{viewCopy[current]}</p></div>
          {canAdd(current, user.role) && <button className={styles.primary} type="button" aria-expanded={showForm}
            onClick={() => { setError(""); setMessage(""); setEditingTool(null); setShowForm((open) => !open); }}>
            {showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {showForm ? "Tutup formulir" : addLabel[current]}
          </button>}
        </div>
        {message && <p className={styles.notice} role="status"><Check size={16} aria-hidden="true" />{message}</p>}
        {error && <p className={styles.error} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {showForm && <FormPanel view={current} user={user} tools={tools} users={users} categories={categories} busy={busy} onCancel={() => setShowForm(false)} onCreateLoan={(input) => run(() => props.onCreateLoan(input), "Pengajuan tersimpan.")} onCreateTool={(input) => run(() => props.onCreateTool(input), "Alat berhasil ditambahkan.")} onCreateUser={(input) => run(() => props.onCreateUser(input), "Pengguna berhasil ditambahkan.")} onCreateCategory={(input) => run(() => props.onCreateCategory(input), "Kategori berhasil ditambahkan.")} />}
        {confirmDelete && <div className={styles.confirmBox} role="alertdialog" aria-labelledby="confirm-title">
          <AlertCircle size={18} aria-hidden="true" />
          <div><strong id="confirm-title">Hapus {confirmDelete.kind === "tool" ? "alat" : "kategori"} “{confirmDelete.name}”?</strong>
            <p>{confirmDelete.kind === "tool" ? "Alat dinonaktifkan dan tidak dapat diajukan lagi." : "Kategori hanya dapat dihapus jika tidak dipakai alat."}</p></div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setConfirmDelete(null)}>Batal</button>
            <button type="button" className={styles.dangerSolid} disabled={busy} onClick={() => {
              const target = confirmDelete;
              void run(() => target.kind === "tool" ? props.onDeleteTool(target.id) : props.onDeleteCategory(target.id),
                target.kind === "tool" ? "Alat berhasil dinonaktifkan." : "Kategori dihapus.");
            }}>{busy ? "Memproses…" : "Ya, hapus"}</button>
          </div>
        </div>}

        {editingTool && (
          <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(() => props.onUpdateTool({
              id: editingTool.id,
              name: String(data.get("name")),
              code: String(data.get("code")),
              categoryId: Number(data.get("categoryId")),
              stock: Number(data.get("stock")),
              condition: String(data.get("condition"))
            }), "Data alat berhasil diperbarui.");
          }}>
            <h2>Edit alat: {editingTool.name}</h2>
            <label>Nama alat<input name="name" defaultValue={editingTool.name} required maxLength={120}/></label>
            <label>Kode alat<input name="code" defaultValue={editingTool.code} required maxLength={32}/></label>
            <label>Kategori<select name="categoryId" defaultValue={editingTool.categoryId} required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Stok total<input name="stock" type="number" min="1" defaultValue={editingTool.stock} required/></label>
            <label>Kondisi<select name="condition" defaultValue={editingTool.condition}><option value="Baik">Baik</option><option value="Perlu perbaikan">Perlu perbaikan</option><option value="Rusak ringan">Rusak ringan</option></select></label>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondary} onClick={() => setEditingTool(null)}>Batal</button>
              <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Menyimpan…" : "Perbarui alat"}</button>
            </div>
          </form>
        )}

        {current === "dashboard" && <><div className={styles.summaryStrip}>
          <SummaryItem label="Alat tersedia" value={availableStock} note={`dari ${totalStock} unit`}/>
          <SummaryItem label="Pinjaman aktif" value={activeLoans.length} note={`${mine.filter((loan) => loan.status === "late").length} terlambat`}/>
          <SummaryItem label="Menunggu" value={pendingCount} note="perlu ditinjau"/>
          <SummaryItem label="Jenis alat" value={tools.filter((tool) => tool.active).length} note="aktif terdaftar"/>
        </div><Panel title="Transaksi terbaru" action={<button type="button" className={styles.linkButton} onClick={() => changeView("loans")}>Lihat semua<ArrowRight size={14} aria-hidden="true"/></button>}>
          <div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengajuan</th><th scope="col">Alat</th><th scope="col">Jatuh tempo</th><th scope="col">Status</th></tr></thead><tbody>{[...mine].sort((a, b) => b.code.localeCompare(a.code)).slice(0, 5).map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower}</span></td><td>{loan.tool} × {loan.qty}</td><td>{dateLabel(loan.dueDate)}</td><td><Status status={loan.status}/></td></tr>)}</tbody></table>{mine.length === 0 && <Empty text="Belum ada transaksi. Mulai dari daftar alat atau pengajuan pertama."/>}</div>
        </Panel></>}

        {current === "inventory" && <><SearchBox value={query} onChange={setQuery} label="Cari alat" placeholder="Cari nama, kode, kategori…"/><div className={styles.cards}>{visibleTools.map((tool) => <article className={styles.toolCard} key={tool.id}><div className={styles.cardTop}><span className={styles.category}>{tool.category}</span><span className={tool.available > 0 ? styles.stock : styles.emptyStock}>{tool.available} tersedia</span></div><h2>{tool.name}</h2><p className={styles.muted}>{tool.code} · kondisi {tool.condition.toLowerCase()}</p><div className={styles.cardBottom}><span>{tool.stock} unit total</span><div className={styles.actions}>{user.role === "peminjam" && <button type="button" className={styles.linkButton} onClick={() => { changeView("loans"); setShowForm(true); }} disabled={tool.available < 1}>Ajukan pinjam</button>}{(user.role === "admin" || user.role === "petugas") && <><button type="button" className={styles.linkButton} onClick={() => { setEditingTool(tool); setShowForm(false); }}><Pencil size={13} aria-hidden="true"/>Edit</button><button type="button" className={styles.dangerButton} disabled={busy} onClick={() => setConfirmDelete({ kind: "tool", id: tool.id, name: tool.name })}><Trash2 size={13} aria-hidden="true"/>Hapus</button></>}</div></div></article>)}</div>{visibleTools.length === 0 && <Empty text={query ? "Tidak ada alat yang cocok. Coba kata kunci lain." : "Belum ada alat aktif. Tambahkan alat pertama untuk memulai."}/>}</>}

        {current === "loans" && <><SearchBox value={query} onChange={setQuery} label="Cari peminjaman" placeholder="Cari kode, nama peminjam, alat…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengajuan</th><th scope="col">Alat</th><th scope="col">Periode</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>{visibleLoans.map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower} · {loan.qty} unit</span></td><td>{loan.tool}</td><td>{dateLabel(loan.borrowDate)}<span className={styles.cellSub}>Kembali {dateLabel(loan.dueDate)}</span></td><td><Status status={loan.status}/></td><td>{user.role !== "peminjam" && loan.status === "pending" ? <div className={styles.actions}><button type="button" className={styles.linkButton} disabled={busy} onClick={() => void run(() => props.onDecideLoan(loan.id, "approved"), "Pengajuan disetujui.")}>Setujui</button><button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void run(() => props.onDecideLoan(loan.id, "rejected"), "Pengajuan ditolak.")}>Tolak</button></div> : "—"}</td></tr>)}</tbody></table>{visibleLoans.length === 0 && <Empty />}</div></>}

        {current === "returns" && <><SearchBox value={query} onChange={setQuery} label="Cari pengembalian" placeholder="Cari kode, nama peminjam, alat…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Peminjaman</th><th scope="col">Alat</th><th scope="col">Jatuh tempo</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>{activeLoans.map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower} · {loan.qty} unit</span>{loan.returnRequested && loan.returnRequestDate && <span className={styles.cellSub}>Tanggal diajukan: {dateLabel(loan.returnRequestDate)}{loan.returnRequestCondition ? ` · ${loan.returnRequestCondition}` : ""}</span>}{loan.returnRequested && loan.returnRequestNote && <span className={styles.cellSub}>Catatan: {loan.returnRequestNote}</span>}</td><td>{loan.tool}</td><td>{dateLabel(loan.dueDate)}</td><td><Status status={loan.status}/></td><td>{user.role === "peminjam" ? loan.returnRequested ? "Menunggu petugas" : <ReturnButton loan={loan} user={user} busy={busy} onReturn={(input) => run(() => props.onReturnLoan(input), "Permintaan pengembalian terkirim.")}/> : loan.returnRequested ? <ReturnButton loan={loan} user={user} busy={busy} onReturn={(input) => run(() => props.onReturnLoan(input), "Pengembalian tercatat.").then((ok) => ok || false)}/> : "Menunggu pengajuan peminjam"}</td></tr>)}</tbody></table>{activeLoans.length === 0 && <Empty />}</div></>}

        {current === "categories" && <><SearchBox value={query} onChange={setQuery} label="Cari kategori" placeholder="Cari nama kategori…"/><div className={styles.cards}>{visibleCategories.map((category) => <article key={category.id} className={styles.toolCard}><div className={styles.cardTop}><span className={styles.category}>Kategori</span><span className={styles.stock}>{category.available} tersedia</span></div><h2>{category.name}</h2><p className={styles.muted}>{category.kinds} jenis alat aktif</p><div className={styles.cardBottom}><button type="button" className={styles.linkButton} onClick={() => { changeView("inventory"); setQuery(category.name); }}>Lihat alat<ArrowRight size={13} aria-hidden="true"/></button>{user.role === "admin" && <button type="button" className={styles.dangerButton} disabled={busy || category.kinds > 0} title={category.kinds > 0 ? "Kategori dipakai alat aktif" : "Hapus kategori"} onClick={() => setConfirmDelete({ kind: "category", id: category.id, name: category.name })}><Trash2 size={13} aria-hidden="true"/>Hapus</button>}</div></article>)}</div>{visibleCategories.length === 0 && <Empty text={query ? "Tidak ada kategori yang cocok." : "Belum ada kategori. Tambahkan kategori untuk mengelompokkan alat."}/>}</>}

        {current === "users" && <><SearchBox value={query} onChange={setQuery} label="Cari pengguna" placeholder="Cari nama, email, role…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengguna</th><th scope="col">Email</th><th scope="col">Peran</th><th scope="col">Akun</th></tr></thead><tbody>{visibleUsers.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.email}</td><td>{roleLabel[item.role]}</td><td><span className={item.active ? styles.active : styles.inactive}>{item.active ? "Aktif" : "Nonaktif"}</span></td></tr>)}</tbody></table>{visibleUsers.length === 0 && <Empty />}</div></>}

        {current === "reports" && <Reports tools={tools} loans={mine} users={users}/>}

        {current === "logs" && <div className={styles.tableWrap}><table><thead><tr><th scope="col">Waktu</th><th scope="col">Pengguna</th><th scope="col">Aksi</th><th scope="col">Objek</th></tr></thead><tbody>{logs.map((entry) => <tr key={entry.id}><td>{entry.at}</td><td>{entry.actor}</td><td>{entry.action}</td><td><code>{entry.target}</code></td></tr>)}</tbody></table>{logs.length === 0 && <Empty />}</div>}
      </section>
    </div>
  </main>;
}

const viewCopy: Record<View, string> = {
  dashboard: "Pantau ketersediaan alat dan transaksi terbaru.",
  loans: "Pantau pengajuan, persetujuan, dan status peminjaman.",
  returns: "Ajukan atau konfirmasi pengembalian alat.",
  inventory: "Cari alat dan periksa ketersediaan sebelum mengajukan.",
  categories: "Kelola kelompok alat agar inventaris mudah ditemukan.",
  users: "Kelola akun dan peran pengguna sekolah.",
  reports: "Rekap kondisi inventaris dan transaksi.",
  logs: "Riwayat tindakan yang tercatat pada sistem."
};
const addLabel: Partial<Record<View, string>> = { inventory: "Tambah alat", loans: "Ajukan pinjaman", users: "Tambah pengguna", categories: "Tambah kategori" };
function canAdd(view: View, role: Role) { return view === "inventory" ? role === "admin" || role === "petugas" : view === "loans" ? true : (view === "users" || view === "categories") && role === "admin"; }

function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) { return <label className={styles.search}><Search size={16} aria-hidden="true"/><span className={styles.srOnly}>{label}</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label}/></label>; }
function Status({ status }: { status: LoanStatus }) { return <span className={`${styles.status} ${styles[status]}`}>{statusText[status]}</span>; }
function Empty({ text = "Tidak ada data yang cocok." }: { text?: string }) { return <p className={styles.empty} role="status">{text}</p>; }
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className={styles.panel}><div className={styles.panelHead}><h2>{title}</h2>{action}</div>{children}</section>; }
function SummaryItem({ label, value, note }: { label: string; value: ReactNode; note: string }) { return <div className={styles.summaryItem}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }

function FormPanel({ view, user, tools, categories = [], busy, onCancel, onCreateLoan, onCreateTool, onCreateUser, onCreateCategory }: { view: View; user: SessionUser; tools: Tool[]; users: User[]; categories?: Category[]; busy: boolean; onCancel: () => void; onCreateLoan: Action<LoanInput>; onCreateTool: Action<ToolInput>; onCreateUser: Action<UserInput>; onCreateCategory: Action<{ name: string }> }) {
  const availableTools = tools.filter((tool) => tool.active && tool.available > 0);
  const [selectedToolId, setSelectedToolId] = useState(availableTools[0]?.id ?? 0);
  const selectedTool = availableTools.find((tool) => tool.id === selectedToolId);
  if (view === "loans") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateLoan({ borrowerId: user.id, toolId: Number(data.get("toolId")), qty: Number(data.get("qty")), dueDate: String(data.get("dueDate")), purpose: String(data.get("purpose")) }); }}>
    <h2>Pengajuan peminjaman</h2>
    {availableTools.length === 0 && <p className={styles.formHint}>Belum ada alat tersedia. Coba lagi setelah stok tersedia.</p>}
    <label>Pilih alat<select name="toolId" required value={selectedTool?.id ?? ""} onChange={(event) => setSelectedToolId(Number(event.target.value))}>{availableTools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name} · {tool.available} tersedia</option>)}</select></label>
    <label>Jumlah<input name="qty" type="number" min="1" max={selectedTool?.available ?? 1} defaultValue="1" required/></label>
    <label>Tanggal kembali<input name="dueDate" type="date" min={dateToday()} required/></label>
    <label className={styles.span2}>Tujuan penggunaan<textarea name="purpose" rows={3} maxLength={500} required/></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Kirim pengajuan" disabled={availableTools.length === 0}/>
  </form>;
  if (view === "inventory") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateTool({ name: String(data.get("name")), code: String(data.get("code")), categoryId: Number(data.get("categoryId")), stock: Number(data.get("stock")), condition: String(data.get("condition")) }); }}>
    <h2>Tambah alat</h2>
    <label>Nama alat<input name="name" required maxLength={120}/></label>
    <label>Kode alat<input name="code" required maxLength={32}/></label>
    <label>Kategori<select name="categoryId" required defaultValue="">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Stok<input name="stock" type="number" min="1" required/></label>
    <label>Kondisi<select name="condition"><option>Baik</option><option>Perlu perbaikan</option></select></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Simpan alat"/>
  </form>;
  if (view === "users") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateUser({ name: String(data.get("name")), email: String(data.get("email")), role: String(data.get("role")) as Role, password: String(data.get("password")) }); }}>
    <h2>Tambah pengguna</h2>
    <label>Nama lengkap<input name="name" required maxLength={120}/></label>
    <label>Email sekolah<input name="email" type="email" required maxLength={254}/></label>
    <label>Kata sandi awal<input name="password" type="password" minLength={12} autoComplete="new-password" required/></label>
    <label>Peran<select name="role"><option value="peminjam">Peminjam</option><option value="petugas">Petugas</option><option value="admin">Admin</option></select></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Tambah pengguna"/>
  </form>;
  if (view === "categories") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateCategory({ name: String(data.get("name")) }); }}>
    <h2>Tambah kategori</h2>
    <label>Nama kategori<input name="name" required maxLength={80} autoFocus/></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Simpan kategori"/>
  </form>;
  return null;
}

function FormActions({ busy, onCancel, submit, disabled = false }: { busy: boolean; onCancel: () => void; submit: string; disabled?: boolean }) { return <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={onCancel}>Batal</button><button type="submit" className={styles.primary} disabled={busy || disabled}>{busy ? "Menyimpan…" : submit}</button></div>; }

function ReturnButton({ loan, user, busy, onReturn }: { loan: Loan; user: SessionUser; busy: boolean; onReturn: ReturnAction }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (!open) return <button type="button" className={styles.linkButton} disabled={busy} onClick={() => setOpen(true)}>{user.role === "peminjam" ? "Ajukan kembali" : "Konfirmasi kembali"}</button>;
  return <form className={styles.returnForm} onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setSubmitting(true); setError(""); try { if (await onReturn({ loanId: loan.id, returnedAt: String(data.get("returnedAt")), condition: String(data.get("condition")), note: String(data.get("note")), intent: user.role === "peminjam" ? "request" : "confirm" }) === false) return; setOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Pengembalian gagal."); } finally { setSubmitting(false); } }}>
    <label>Tanggal<input name="returnedAt" type="date" min={loan.borrowDate} max={dateToday()} defaultValue={dateToday()} required/></label>
    <label>Kondisi<select name="condition"><option>Baik</option><option>Rusak ringan</option><option>Rusak berat</option></select></label>
      <label className={styles.span2}>Catatan<textarea name="note" rows={2} maxLength={500}/></label>
      {error && <span className={styles.error} role="alert">{error}</span>}
      <button type="submit" className={styles.primary} disabled={busy || submitting}>{busy || submitting ? "Menyimpan…" : "Kirim"}</button><button type="button" className={styles.secondary} disabled={submitting} onClick={() => setOpen(false)}>Batal</button>
    </form>;
}

function Reports({ tools, loans, users }: { tools: Tool[]; loans: Loan[]; users: User[] }) {
  const totalStock = tools.reduce((sum, tool) => sum + tool.stock, 0);
  const available = tools.reduce((sum, tool) => sum + tool.available, 0);
  const groups = useMemo(() => Array.from(new Set(tools.map((tool) => tool.category))).map((category) => { const items = tools.filter((tool) => tool.category === category); return { category, kinds: items.length, stock: items.reduce((sum, tool) => sum + tool.stock, 0), available: items.reduce((sum, tool) => sum + tool.available, 0) }; }), [tools]);
  return <>
    <div className={styles.summaryStrip}>
      <SummaryItem label="Stok tersedia" value={`${available} / ${totalStock}`} note="unit tersedia / total"/>
      <SummaryItem label="Pinjaman aktif" value={loans.filter((loan) => activeStatuses.includes(loan.status)).length} note="belum dikembalikan"/>
      <SummaryItem label="Menunggu" value={loans.filter((loan) => loan.status === "pending").length} note="perlu ditinjau"/>
      <SummaryItem label="Pengguna aktif" value={users.filter((item) => item.active).length} note="seluruh peran"/>
    </div>
    <div className={styles.reportHead}><h2>Inventaris per kategori</h2><button className={styles.secondary} type="button" onClick={() => window.print()}>Cetak laporan</button></div>
    <div className={styles.tableWrap}><table><thead><tr><th scope="col">Kategori</th><th scope="col">Jenis</th><th scope="col">Total unit</th><th scope="col">Tersedia</th><th scope="col">Dipinjam</th></tr></thead><tbody>{groups.map((group) => <tr key={group.category}><td><strong>{group.category}</strong></td><td>{group.kinds}</td><td>{group.stock}</td><td>{group.available}</td><td>{group.stock - group.available}</td></tr>)}</tbody></table>{groups.length === 0 && <Empty text="Belum ada inventaris untuk dilaporkan."/>}</div>
  </>;
}
