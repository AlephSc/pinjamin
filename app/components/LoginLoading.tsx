import styles from "@/app/components/PinjaminWorkspace.module.css";

export default function LoginLoading() {
  return <main className={styles.loginShell} aria-busy="true" aria-label="Memuat halaman masuk">
    <section className={styles.loginAside} aria-hidden="true">
      <div className={styles.loginBrand}><span>P</span><span>Pinjamin<small>Inventaris sekolah yang tertata dan akurat.</small></span></div>
      <div><span className={styles.skeletonTitle} /><span className={styles.skeletonLine} /></div>
    </section>
    <section className={styles.loginMain}>
      <div className={styles.loginCard}>
        <span className={styles.skeletonTitle} aria-hidden="true" />
        <span className={styles.skeletonLine} aria-hidden="true" />
        <div className={styles.loginForm} aria-hidden="true">
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
        </div>
        <p className={styles.empty} role="status">Memuat halaman masuk…</p>
      </div>
    </section>
  </main>;
}
