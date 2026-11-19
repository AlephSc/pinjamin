import styles from "./PinjaminWorkspace.module.css";

export default function WorkspaceLoading() {
  return <main className={styles.workspace} aria-busy="true" aria-label="Memuat ruang kerja">
    <aside className={styles.rail}>
      <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">P</span><span>Pinjamin</span></div>
      <div className={styles.skeletonNav} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => <span key={i} className={styles.skeletonLine} />)}
      </div>
    </aside>
    <div className={styles.main}>
      <header className={styles.topbar}><span className={styles.skeletonPill} aria-hidden="true" /></header>
      <section className={styles.content}>
        <span className={styles.skeletonTitle} aria-hidden="true" />
        <span className={styles.skeletonLine} aria-hidden="true" />
        <div className={styles.summaryStrip} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.summaryItem}><span className={styles.skeletonLine} /><span className={styles.skeletonLine} /></div>)}
        </div>
        <div className={styles.tableWrap} aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}
        </div>
        <p className={styles.empty} role="status">Memuat data ruang kerja…</p>
      </section>
    </div>
  </main>;
}
