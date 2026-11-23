"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import styles from "./PinjaminWorkspace.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [csrf, setCsrf] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let token = csrf;
      if (!token) {
        const challenge = await fetch("/api/auth/challenge", { cache: "no-store" });
        const value = await challenge.json();
        if (!challenge.ok || typeof value.csrf !== "string") throw new Error("Tidak dapat memulai sesi masuk.");
        if (!document.cookie.split(";").some(part => part.trim() === `pinjamin_login_csrf=${value.csrf}`)) throw new Error("Cookie keamanan masuk tidak tersedia. Muat ulang halaman.");
        token = value.csrf;
        setCsrf(token);
      }
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "Origin": window.location.origin, "X-CSRF-Token": token }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Masuk gagal.");
      router.replace(body.user.role === "admin" ? "/admin" : body.user.role === "petugas" ? "/petugas" : "/");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Masuk gagal."); }
    finally { setBusy(false); }
  }

  async function startGoogle() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/google", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || typeof body.url !== "string") throw new Error(body.error?.message ?? "Login Google belum diaktifkan.");
      window.location.assign(body.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Login Google belum diaktifkan."); }
    finally { setBusy(false); }
  }

  return <main className={styles.loginShell}>
    <section className={styles.loginAside} aria-label="Tentang Pinjamin">
      <a className={styles.loginBrand} href="/"><span aria-hidden="true">P</span><span>Pinjamin<small>Inventaris sekolah, lebih tertata.</small></span></a>
      <div>
        <h2>Satu ruang kerja untuk seluruh peminjaman alat sekolah.</h2>
        <p>Dari pengajuan sampai pengembalian, setiap langkah tercatat dan stok tetap akurat.</p>
      </div>
      <ol className={styles.loginSteps}>
        <li><span aria-hidden="true">1</span>Peminjam mengajukan alat yang tersedia.</li>
        <li><span aria-hidden="true">2</span>Petugas menyetujui dan mencatat pengembalian.</li>
        <li><span aria-hidden="true">3</span>Admin memantau laporan dan aktivitas.</li>
      </ol>
    </section>
    <section className={styles.loginMain}>
      <div className={styles.loginCard} aria-labelledby="login-title">
        <a className={styles.loginBrand} href="/"><span aria-hidden="true">P</span><span>Pinjamin<small>Inventaris sekolah, lebih tertata.</small></span></a>
        <h1 id="login-title">Masuk ke ruang kerja</h1>
        <p className={styles.loginLead}>Gunakan akun sekolah Anda. Akses menyesuaikan peran: admin, petugas, atau peminjam.</p>
        <button type="button" className={styles.loginGoogle} onClick={startGoogle} disabled={busy}>
          <span className={styles.loginGoogleMark} aria-hidden="true">G</span>
          Lanjutkan dengan Google
        </button>
        <div className={styles.loginDivider} aria-hidden="true">atau</div>
        <form className={styles.loginForm} onSubmit={submit}>
          <label>Email sekolah<input type="email" autoComplete="username" placeholder="nama@sekolah.sch.id" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required /></label>
          <label>Kata sandi<input type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} maxLength={1024} required /></label>
          {error && <p className={styles.error} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
          <button className={styles.primary} type="submit" disabled={busy}>{busy ? "Memverifikasi…" : "Masuk"}</button>
        </form>
        <a className={styles.loginBack} href="/"><ArrowLeft size={13} aria-hidden="true" /> Kembali</a>
      </div>
    </section>
  </main>;
}
