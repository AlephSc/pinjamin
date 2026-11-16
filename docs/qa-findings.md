# Pinjamin — temuan audit

Terakhir diverifikasi: `npm run check` dan `npm run build` lulus. `node tests/loan-lifecycle.mjs`: 16 checks lulus, 7 gap terbuka.

## Critical
- **API auth belum terhubung.** `requireRole` fail-closed (401) karena tidak ada session resolver. Sebelum rilis: integrasikan autentikasi server tepercaya; uji role + kepemilikan borrower untuk semua route. Owner: backend.

## High
- **Stok dan status belum atomik.** Approval harus mengunci loan pending, update stok dengan kondisi `available >= qty`, ubah status dan tulis activity log dalam satu transaksi. Tolak konflik/out-of-stock. Owner: backend + DB.
- **Identitas peminjam tak terikat pada session.** Jangan percaya `borrowerId` dari body; turunkan dari session aktif dengan role `peminjam`. Tolak akun nonaktif. Owner: backend.
- **Lifecycle belum membatasi semua transisi.** Tolak approval/rejection non-pending, pengembalian duplikat, alat nonaktif, dan tanggal tidak valid; perubahan return/stok/log harus atomik. Owner: backend.
- **UI demo mengganti role secara lokal.** Bukan otorisasi. Hapus role-switch saat integrasi auth; sembunyikan aksi dan enforce di server. Owner: frontend + backend.

## Medium
- **Denda tidak dijamin schema.** Hitung server-side dari tanggal jatuh tempo dan tanggal kembali; tarif awal Rp2.000/hari, jangan terima nilai denda klien. Owner: backend + DB.
- **Batas stok pinjaman.** Validasi kuantitas tersedia pada approval dengan transaksi/conditional update; bukan hanya saat membuat pengajuan. Owner: backend + DB.

## Ringkasan
Pemeriksaan saat ini lulus untuk schema/seed PGlite, typecheck, validasi input dasar, kalkulasi denda, dan auth fail-closed. Lulus build bukan berarti siap produksi: autentikasi belum disambungkan dan alur stok/lifecycle masih membutuhkan integrasi transaksional.
