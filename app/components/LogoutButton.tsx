"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import styles from "./PinjaminWorkspace.module.css";
export default function LogoutButton() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  async function logout() {
    setFailed(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "fetch" } });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/masuk");
      router.refresh();
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => { void logout(); }, []);
  return <main className={styles.logoutPage} role={failed ? "alert" : "status"}>
    {failed
      ? <><AlertCircle size={18} aria-hidden="true"/><p>Gagal mengakhiri sesi.</p><button type="button" className={styles.primary} onClick={() => void logout()}>Coba lagi</button></>
      : <p>Mengakhiri sesi…</p>}
  </main>;
}
