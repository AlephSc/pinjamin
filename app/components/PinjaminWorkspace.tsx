"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Category, Loan, LoanStatus, LogEntry, Role, SessionUser, Tool, User } from "@/lib/types";
import styles from "./PinjaminWorkspace.module.css";

type View = "dashboard" | "loans" | "returns" | "inventory" | "categories" | "users" | "reports" | "logs";
type LoanInput = { borrowerId: number; toolId: number; qty: number; dueDate: string; purpose: string };
type ReturnInput = { loanId: number; returnedAt: string; condition: string; note: string; intent: "request" | "confirm" };
type ToolInput = { name: string; categoryId: number; stock: number; condition: string; code: string };
type UserInput = { name: string; email: string; role: Role };
type Action<T> = (input: T) => void | Promise<void>;

export type PinjaminWorkspaceProps = {
  user: SessionUser;
  tools: Tool[];
  loans: Loan[];
  users: User[];
  categories?: Category[];
  logs?: LogEntry[];
  demoMode?: boolean;
  onDemoRoleChange?: (role: Role) => void;
  onCreateLoan: Action<LoanInput>;
  onDecideLoan: (loanId: number, status: Extract<LoanStatus, "approved" | "rejected">) => void | Promise<void>;
  onReturnLoan: Action<ReturnInput>;
  onCreateTool: Action<ToolInput>;
  onCreateUser: Action<UserInput>;
};

const labels: Record<View, string> = { dashboard: "Ringkasan", loans: "Peminjaman", returns: "Pengembalian", inventory: "Alat", categories: "Kategori", users: "Pengguna", reports: "Laporan", logs: "Log aktivitas" };
const statusText: Record<LoanStatus, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", borrowed: "Dipinjam", late: "Terlambat", returned: "Dikembalikan" };
const activeStatuses: LoanStatus[] = ["approved", "borrowed", "late"];
const navByRole: Record<Role, View[]> = {
  admin: ["dashboard", "loans", "returns", "inventory", "categories", "users", "reports", "logs"],
  petugas: ["dashboard", "loans", "returns", "inventory", "reports"],
  peminjam: ["dashboard", "inventory", "loans", "returns"]
};
const dateToday = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function PinjaminWorkspace(props: PinjaminWorkspaceProps) {
  const { user, tools, loans, users, categories = [], logs = [] } = props;
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const nav = navByRole[user.role];
  const current = nav.includes(view) ? view : nav[0];
  const mine = user.role !== "peminjam" ? loans : loans.filter((loan) => loan.borrowerId === user.id);
  const match = (text: string) => text.toLowerCase().includes(query.toLowerCase());
  const visibleLoans = useMemo(() => mine.filter((loan) => match(`${loan.code} ${loan.borrower} ${loan.tool}`)), [query, loans, user.id, user.role]);
  const visibleTools = useMemo(() => tools.filter((tool) => tool.active && match(`${tool.name} ${tool.code} ${tool.category}`)), [tools, query]);
  const visibleUsers = useMemo(() => users.filter((item) => match(`${item.name} ${item.email} ${item.role}`)), [users, query]);
  const activeLoans = visibleLoans.filter((loan) => activeStatuses.includes(loan.status));

  async function run(action: () => void | Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); setShowForm(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Perubahan gagal. Coba lagi."); }
    finally { setBusy(false); }
  }

  return <main className={styles.workspace}>
    <header className={styles.topbar}>
      <a className={styles.brand} href="#workspace" aria-label="Pinjamin, ke ruang kerja"><span aria-hidden="true">P</span> Pinjamin</a>
      <div className={styles.session}>
        <span>{user.name}</span><span className={styles.role}>{user.role}</span>
        {props.demoMode && <>
          <label className={styles.demoRole}>Tampilan demo<select aria-label="Ganti peran demo" value={user.role} onChange={(event) => { props.onDemoRoleChange?.(event.target.value as Role); setView("dashboard"); setShowForm(false); }}><option value="admin">Admin</option><option value="petugas">Petugas</option><option value="peminjam">Peminjam</option></select></label>
          <span className={styles.demo}>Data demo · tanpa autentikasi</span>
        </>}
      </div>
    </header>
    <div id="workspace" className={styles.layout}>
      <nav className={styles.nav} aria-label="Modul Pinjamin">{nav.map((item) => <button key={item} type="button" className={current === item ? styles.selected : ""} aria-current={current === item ? "page" : undefined} onClick={() => { setView(item); setQuery(""); setShowForm(false); setError(""); setMessage(""); }}>{labels[item]}{item === "loans" && mine.some((loan) => loan.status === "pending") && user.role !== "peminjam" ? <span className={styles.navCount}>{mine.filter((loan) => loan.status === "pending").length}</span> : null}</button>)}</nav>
      <section className={styles.content} aria-labelledby="view-title">
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>Ruang kerja / {labels[current]}</p><h1 id="view-title">{labels[current]}</h1><p className={styles.muted}>{viewCopy[current]}</p></div>
          {canAdd(current, user.role) && <button className={styles.primary} type="button" aria-expanded={showForm} onClick={() => { setError(""); setMessage(""); setShowForm((open) => !open); }}>{showForm ? "Tutup formulir" : addLabel[current]}</button>}
        </div>
        {message && <p className={styles.notice} role="status">{message}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {showForm && <FormPanel view={current} user={user} tools={tools} users={users} busy={busy} onCancel={() => setShowForm(false)} onCreateLoan={(input) => run(() => props.onCreateLoan(input), "Pengajuan tersimpan.")} onCreateTool={(input) => run(() => props.onCreateTool(input), "Alat berhasil ditambahkan.")} onCreateUser={(input) => run(() => props.onCreateUser(input), "Pengguna berhasil ditambahkan.")} />}

        {current === "dashboard" && <><div className={styles.metrics}>
          <Metric label="Alat tersedia" value={`${tools.reduce((sum, tool) => sum + tool.available, 0)}`} note={`dari ${tools.reduce((sum, tool) => sum + tool.stock, 0)} unit`}/>
          <Metric label="Pinjaman aktif" value={activeLoans.length} note={`${mine.filter((loan) => loan.status === "late").length} terlambat`}/>
          <Metric label="Menunggu" value={mine.filter((loan) => loan.status === "pending").length} note="perlu ditinjau"/>
          <Metric label="Alat terdaftar" value={tools.filter((tool) => tool.active).length} note="jenis aktif"/>
        </div><Panel title="Transaksi terbaru" action={<button type="button" className={styles.linkButton} onClick={() => setView("loans")}>Lihat semua</button>}>
          <div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengajuan</th><th scope="col">Alat</th><th scope="col">Jatuh tempo</th><th scope="col">Status</th></tr></thead><tbody>{[...mine].sort((a, b) => b.code.localeCompare(a.code)).slice(0, 5).map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower}</span></td><td>{loan.tool} × {loan.qty}</td><td>{dateLabel(loan.dueDate)}</td><td><Status status={loan.status}/></td></tr>)}</tbody></table>{mine.length === 0 && <Empty />}</div>
        </Panel></>}

        {current === "inventory" && <><SearchBox value={query} onChange={setQuery} label="Cari alat" placeholder="Cari nama, kode, kategori…"/><div className={styles.cards}>{visibleTools.map((tool) => <article className={styles.toolCard} key={tool.id}><div className={styles.cardTop}><span className={styles.category}>{tool.category}</span><span className={tool.available > 0 ? styles.stock : styles.emptyStock}>{tool.available} tersedia</span></div><h2>{tool.name}</h2><p className={styles.muted}>{tool.code} · kondisi {tool.condition.toLowerCase()}</p><div className={styles.cardBottom}><span>{tool.stock} unit total</span>{user.role === "peminjam" && <button type="button" className={styles.linkButton} onClick={() => { setView("loans"); setShowForm(true); }} disabled={tool.available < 1}>Ajukan pinjam</button>}</div></article>)}</div>{visibleTools.length === 0 && <Empty />}</>}

        {current === "loans" && <><SearchBox value={query} onChange={setQuery} label="Cari peminjaman" placeholder="Cari kode, nama peminjam, alat…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengajuan</th><th scope="col">Alat</th><th scope="col">Periode</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>{visibleLoans.map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower} · {loan.qty} unit</span></td><td>{loan.tool}</td><td>{dateLabel(loan.borrowDate)}<span className={styles.cellSub}>Kembali {dateLabel(loan.dueDate)}</span></td><td><Status status={loan.status}/></td><td>{user.role !== "peminjam" && loan.status === "pending" ? <div className={styles.actions}><button type="button" className={styles.linkButton} disabled={busy} onClick={() => void run(() => props.onDecideLoan(loan.id, "approved"), "Pengajuan disetujui.")}>Setujui</button><button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void run(() => props.onDecideLoan(loan.id, "rejected"), "Pengajuan ditolak.")}>Tolak</button></div> : "—"}</td></tr>)}</tbody></table>{visibleLoans.length === 0 && <Empty />}</div></>}

        {current === "returns" && <><SearchBox value={query} onChange={setQuery} label="Cari pengembalian" placeholder="Cari kode, nama peminjam, alat…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Peminjaman</th><th scope="col">Alat</th><th scope="col">Jatuh tempo</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>{activeLoans.map((loan) => <tr key={loan.id}><td><strong>{loan.code}</strong><span className={styles.cellSub}>{loan.borrower} · {loan.qty} unit</span></td><td>{loan.tool}</td><td>{dateLabel(loan.dueDate)}</td><td><Status status={loan.status}/></td><td><ReturnButton loan={loan} user={user} busy={busy} onReturn={(input) => run(() => props.onReturnLoan(input), user.role === "peminjam" ? "Permintaan pengembalian terkirim." : "Pengembalian tercatat.")}/></td></tr>)}</tbody></table>{activeLoans.length === 0 && <Empty />}</div></>}

        {current === "categories" && <div className={styles.cards}>{categories.map((category) => <button key={category.id} type="button" className={styles.toolCard} onClick={() => { setView("inventory"); setQuery(category.name); }}><div className={styles.cardTop}><span className={styles.category}>Kategori</span><span className={styles.stock}>{category.available} tersedia</span></div><h2>{category.name}</h2><p className={styles.muted}>{category.kinds} jenis alat</p><p className={styles.linkButton}>Lihat alat</p></button>)}{categories.length === 0 && <Empty />}</div>}

        {current === "users" && <><SearchBox value={query} onChange={setQuery} label="Cari pengguna" placeholder="Cari nama, email, role…"/><div className={styles.tableWrap}><table><thead><tr><th scope="col">Pengguna</th><th scope="col">Email</th><th scope="col">Peran</th><th scope="col">Akun</th></tr></thead><tbody>{visibleUsers.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.email}</td><td>{item.role}</td><td><span className={item.active ? styles.active : styles.inactive}>{item.active ? "Aktif" : "Nonaktif"}</span></td></tr>)}</tbody></table>{visibleUsers.length === 0 && <Empty />}</div></>}

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
  categories: "Ringkasan inventaris berdasarkan kategori.",
  users: "Daftar akun dan peran pengguna sekolah.",
  reports: "Rekap kondisi inventaris dan transaksi.",
  logs: "Riwayat tindakan yang tercatat pada sistem."
};
const addLabel: Partial<Record<View, string>> = { inventory: "Tambah alat", loans: "Ajukan pinjaman", users: "Tambah pengguna" };
function canAdd(view: View, role: Role) { return view === "inventory" ? role === "admin" || role === "petugas" : view === "loans" ? true : view === "users" && role === "admin"; }

function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) { return <label className={styles.search}><span>{label}</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/></label>; }
function Status({ status }: { status: LoanStatus }) { return <span className={`${styles.status} ${styles[status]}`}>{statusText[status]}</span>; }
function Empty() { return <p className={styles.empty} role="status">Tidak ada data yang cocok.</p>; }
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className={styles.panel}><div className={styles.panelHead}><h2>{title}</h2>{action}</div>{children}</section>; }

function FormPanel({ view, user, tools, users, busy, onCancel, onCreateLoan, onCreateTool, onCreateUser }: { view: View; user: SessionUser; tools: Tool[]; users: User[]; busy: boolean; onCancel: () => void; onCreateLoan: Action<LoanInput>; onCreateTool: Action<ToolInput>; onCreateUser: Action<UserInput> }) {
  if (view === "loans") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateLoan({ borrowerId: user.id, toolId: Number(data.get("toolId")), qty: Number(data.get("qty")), dueDate: String(data.get("dueDate")), purpose: String(data.get("purpose")) }); }}>
    <h2>Pengajuan peminjaman</h2>
    <label>Pilih alat<select name="toolId" required defaultValue="">{tools.filter((tool) => tool.active && tool.available > 0).map((tool) => <option key={tool.id} value={tool.id}>{tool.name} · {tool.available} tersedia</option>)}</select></label>
    <label>Jumlah<input name="qty" type="number" min="1" max={Math.max(1, ...tools.map((tool) => tool.available))} defaultValue="1" required/></label>
    <label>Tanggal kembali<input name="dueDate" type="date" min={dateToday()} required/></label>
    <label className={styles.span2}>Tujuan penggunaan<textarea name="purpose" rows={3} maxLength={500} required/></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Kirim pengajuan"/>
  </form>;
  if (view === "inventory") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateTool({ name: String(data.get("name")), code: String(data.get("code")), categoryId: Number(data.get("categoryId")), stock: Number(data.get("stock")), condition: String(data.get("condition")) }); }}>
    <h2>Tambah alat</h2>
    <label>Nama alat<input name="name" required maxLength={120}/></label>
    <label>Kode alat<input name="code" required maxLength={32}/></label>
    <label>Kategori ID<input name="categoryId" type="number" min="1" required/></label>
    <label>Stok<input name="stock" type="number" min="1" required/></label>
    <label>Kondisi<select name="condition"><option>Baik</option><option>Perlu perbaikan</option></select></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Simpan alat"/>
  </form>;
  if (view === "users") return <form className={styles.form} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void onCreateUser({ name: String(data.get("name")), email: String(data.get("email")), role: String(data.get("role")) as Role }); }}>
    <h2>Tambah pengguna</h2>
    <label>Nama lengkap<input name="name" required maxLength={120}/></label>
    <label>Email sekolah<input name="email" type="email" required maxLength={254}/></label>
    <label>Peran<select name="role"><option value="peminjam">Peminjam</option><option value="petugas">Petugas</option><option value="admin">Admin</option></select></label>
    <FormActions busy={busy} onCancel={onCancel} submit="Tambah pengguna"/>
  </form>;
  return null;
}

function FormActions({ busy, onCancel, submit }: { busy: boolean; onCancel: () => void; submit: string }) { return <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={onCancel}>Batal</button><button type="submit" className={styles.primary} disabled={busy}>{busy ? "Menyimpan…" : submit}</button></div>; }

function ReturnButton({ loan, user, busy, onReturn }: { loan: Loan; user: SessionUser; busy: boolean; onReturn: Action<ReturnInput> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className={styles.linkButton} onClick={() => setOpen(true)}>{user.role === "peminjam" ? "Ajukan kembali" : "Konfirmasi kembali"}</button>;
  return <form className={styles.returnForm} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); setOpen(false); void onReturn({ loanId: loan.id, returnedAt: String(data.get("returnedAt")), condition: String(data.get("condition")), note: String(data.get("note")), intent: user.role === "peminjam" ? "request" : "confirm" }); }}>
    <label>Tanggal<input name="returnedAt" type="date" min={loan.borrowDate} defaultValue={dateToday()} required/></label>
    <label>Kondisi<select name="condition"><option>Baik</option><option>Rusak ringan</option><option>Rusak berat</option></select></label>
    <label className={styles.span2}>Catatan<textarea name="note" rows={2} maxLength={500}/></label>
    <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Menyimpan…" : "Kirim"}</button><button type="button" className={styles.secondary} onClick={() => setOpen(false)}>Batal</button>
  </form>;
}

function Reports({ tools, loans, users }: { tools: Tool[]; loans: Loan[]; users: User[] }) {
  const totalStock = tools.reduce((sum, tool) => sum + tool.stock, 0);
  const available = tools.reduce((sum, tool) => sum + tool.available, 0);
  const groups = Array.from(new Set(tools.map((tool) => tool.category))).map((category) => { const items = tools.filter((tool) => tool.category === category); return { category, kinds: items.length, stock: items.reduce((sum, tool) => sum + tool.stock, 0), available: items.reduce((sum, tool) => sum + tool.available, 0) }; });
  return <>
    <div className={styles.metrics}>
      <Metric label="Stok tersedia" value={`${available} / ${totalStock}`} note="unit tersedia / total"/>
      <Metric label="Pinjaman aktif" value={loans.filter((loan) => activeStatuses.includes(loan.status)).length} note="belum dikembalikan"/>
      <Metric label="Menunggu" value={loans.filter((loan) => loan.status === "pending").length} note="perlu ditinjau"/>
      <Metric label="Pengguna aktif" value={users.filter((item) => item.active).length} note="seluruh peran"/>
    </div>
    <div className={styles.reportHead}><h2>Inventaris per kategori</h2><button className={styles.secondary} type="button" onClick={() => window.print()}>Cetak laporan</button></div>
    <div className={styles.tableWrap}><table><thead><tr><th scope="col">Kategori</th><th scope="col">Jenis</th><th scope="col">Total unit</th><th scope="col">Tersedia</th><th scope="col">Dipinjam</th></tr></thead><tbody>{groups.map((group) => <tr key={group.category}><td><strong>{group.category}</strong></td><td>{group.kinds}</td><td>{group.stock}</td><td>{group.available}</td><td>{group.stock - group.available}</td></tr>)}</tbody></table></div>
  </>;
}
function Metric({ label, value, note }: { label: string; value: ReactNode; note: string }) { return <article className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
