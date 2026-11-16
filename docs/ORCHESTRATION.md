# Orkestrasi Pinjamin

Peran utama: **orkestrator + auditor**. Tidak menulis fitur; menetapkan kontrak, memecah kerja, mengaudit hasil, dan merakit integrasi.

## Kontrak bersama (dibekukan sebelum dispatch)

| Area | Pemilik | File yang boleh disentuh |
|---|---|---|
| Database & persistence | agent DB | `db/**`, `lib/server/db/**`, `docs/database.md` |
| API backend | agent Backend | `app/api/**`, `lib/server/api/**` |
| UI frontend | agent Frontend | `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/**`, `lib/store.tsx` |
| Kualitas & keamanan | agent QA | `tests/**`, `docs/qa-findings.md` |
| Kontrak, audit, integrasi | orkestrator | `lib/types.ts`, `docs/ORCHESTRATION.md`, `docs/PRD.md`, `package.json` |

Aturan yang berlaku untuk semua agent:

1. Dilarang `git commit`/`git push`.
2. Dilarang menambah dependency; kebutuhan dependency dilaporkan ke orkestrator.
3. Dilarang mengubah file milik agent lain. Konflik file = kegagalan.
4. Status pinjaman: `pending`, `approved`, `rejected`, `borrowed`, `late`, `returned`. Role: `admin`, `petugas`, `peminjam`.
5. Denda = `max(0, tanggal_kembali − jatuh_tempo) × 2000`.
6. Stok berkurang saat pengajuan disetujui, bertambah saat pengembalian dikonfirmasi, dalam satu transaksi DB.
7. Tanpa sesi autentikasi nyata, endpoint mutasi mengembalikan 401 — bukan header role palsu.

## Rencana per agent

### Agent 1 — Database
- Deliverable: `db/schema.sql` final, `db/seed.sql`, adapter query di `lib/server/db/index.ts`, `docs/database.md`.
- Pekerjaan: validasi schema dengan PGlite (PostgreSQL-compatible), seed data realistis (kategori, user 3 role, alat, transaksi contoh termasuk yang terlambat), fungsi query + transaksi atomik untuk approve/return.
- Kriteria selesai: schema ter-apply di PGlite tanpa error, seed ter-apply, smoke query mengembalikan baris.

### Agent 2 — Backend API
- Deliverable: route handler App Router di `app/api/**`.
- Endpoint inti: `GET /api/tools`, `GET /api/loans`, `POST /api/loans`, `PATCH /api/loans/[id]`, `POST /api/loans/[id]/return`, `GET /api/summary`.
- Pekerjaan: validasi input server-side, query parameterized, error JSON konsisten `{error:{code,message}}`, guard otorisasi dengan seam sesi, denda dihitung server.
- Kriteria selesai: `tsc --noEmit` bersih, build lulus, aturan bisnis punya self-check yang bisa dijalankan.

### Agent 3 — Frontend
- Deliverable: UI multi-halaman sesuai PRD (`Ringkasan`, `Peminjaman`, `Pengembalian`, `Alat`, `Kategori`, `Pengguna`, `Laporan`, `Log aktivitas`), responsif 360 px ke atas.
- Pekerjaan: layout, tabel, form modal, state kosong, status teks (bukan warna saja), fokus keyboard terlihat, `prefers-reduced-motion`.
- Kriteria selesai: `tsc --noEmit` bersih, navigasi semua view jalan, tidak ada data karangan di luar penanda mode demo.

### Agent 4 — QA & Keamanan
- Deliverable: `tests/**` runnable + `docs/qa-findings.md`.
- Pekerjaan: uji siklus pinjam (validasi pengajuan, stok, denda, celah otorisasi), catat cacat berisiko pada store/DB/API.
- Kriteria selesai: skrip uji dieksekusi, hasil nyata dilaporkan, temuan dipetakan ke perbaikan konkret.

## Urutan integrasi & audit

1. Kontrak (`lib/types.ts`, `db/schema.sql`) — selesai sebelum dispatch.
2. Fan-out 4 agent paralel.
3. Audit hasil per agent: cek file benar-benar berubah, jalankan `npx tsc --noEmit`, `npm run build`.
4. Rekonsiliasi: samakan bentuk data API ↔ tipe bersama ↔ UI; hapus duplikasi adapter.
5. Gate akhir: build produksi, uji QA hijau, dokumentasi UKK (ERD, flowchart, test case) menyusul.

## Batas kejujuran

- Anak agent hilang bila proses induk berhenti; supervisi hanya selama sesi ini hidup.
- Ringkasan anak adalah klaim, bukan bukti — semua artefak diverifikasi ulang oleh orkestrator.
