"use client";
import { AlertCircle } from "lucide-react";
import styles from "./PinjaminWorkspace.module.css";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={styles.logoutPage} role="alert">
    <AlertCircle size={22} aria-hidden="true" />
    <h1 style={{ margin: 0, fontSize: 20, color: "var(--ink)" }}>Ruang kerja gagal dimuat</h1>
    <p>Terjadi kesalahan saat mengambil data. Coba muat ulang; jika berlanjut, hubungi administrator.</p>
    {error.digest && <p style={{ fontSize: 12 }}>Kode: {error.digest}</p>}
    <button type="button" className={styles.primary} onClick={reset}>Coba lagi</button>
  </main>;
}
