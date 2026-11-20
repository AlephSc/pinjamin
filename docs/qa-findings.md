# Pinjamin — status QA

Diverifikasi pada 2026-11-19 setelah redesign UI/UX dan perbaikan sistem. `npm run typecheck`, `npm run check` (20 lifecycle + 7 kategori + schema/migration/route), `npm run build`, dan smoke route lokal lulus. Verifikasi browser lokal mencakup login, workspace admin/peminjam, buat/hapus kategori, daftar alat, dan form pengajuan.

## Perubahan terverifikasi iterasi ini

- Redesign monokrom + biru sinyal `#4B8DFF` (60/30/10): rail hitam, area kerja putih, form inline, tabel/status rapi, loading/error boundary, konfirmasi hapus inline.
- Perbaikan batas RSC: `PinjaminDemo` (server) tidak lagi mengirim callback ke client; aksi API dipindah ke `WorkspaceClient`.
- Perbaikan `assertSameOrigin`: membandingkan Origin dengan host/forwarded-host, bukan `request.url` yang dinormalkan Next ke `localhost`; request sah tidak lagi 403, cross-origin tetap 403.
- CRUD kategori admin: API + UI + test PGlite (create/list/delete, duplikat, kategori terpakai tidak boleh dihapus).
- Migrasi `20261117_return_requests.sql` dan `20261118_return_audit.sql` diterapkan ke database yang dipakai lokal; kolom return request/audit terverifikasi ada.
- `AUTH_SECRET` lokal ditambahkan (di-generate, tidak ditampilkan); sebelumnya hanya `DATABASE_URL` sehingga login/sesi gagal.
- Fixture/route QA sementara sudah dihapus setelah pengujian; tidak ada kredensial QA tersisa di source.

## Blocker rilis

- **Production sudah live (2026-11-20).** Commit `42b07bc` ter-deploy; `/`, `/masuk`, `/api/auth/challenge`, `/api/auth/me` = 200. Alur challenge CSRF → login kredensial salah = 401 `INVALID_CREDENTIALS`; tanpa CSRF = 403 `CSRF_FAILED`. `AUTH_SECRET` diset di Vercel (Production/Preview/Development) via Playwriter; `DATABASE_URL` sudah ada.
- **Login ber-role produksi belum diuji dengan akun sah.** Perlu akun admin/petugas/peminjam aktif di database produksi untuk E2E penuh.
- **Logout tidak mencabut JWT yang sudah dicuri.** Sesi stateless berlaku sampai TTL 12 jam; pertimbangkan revocation/TTL lebih pendek sesuai kebutuhan ancaman.
- **CRUD user belum lengkap.** Baru create; edit/nonaktifkan belum ada. Laporan belum filter tanggal/status dan ekspor CSV/PDF.
- **Rotasi credential GitHub** yang pernah terekspos di sesi lama belum dikonfirmasi.

## Bukti saat ini

- Lifecycle API memvalidasi status, role, kepemilikan borrower, tanggal return, dan transaksi stok dengan row lock; diuji PGlite.
- Test kategori memvalidasi create/list/delete, konflik nama, dan larangan hapus kategori yang dipakai alat (termasuk alat nonaktif).
- Smoke route: halaman publik 200, challenge CSRF, sesi anonim, API terlindungi 401, dan cross-origin 403.
- Browser lokal: login API 200 + sesi role; workspace admin render nav/ringkasan/tabel; kategori dibuat (201) dan dihapus (200) via UI; peminjam melihat 8 alat dan form pengajuan dengan max qty mengikuti alat terpilih; mobile 390px tanpa overflow horizontal.
- Detector desain impeccable: tidak ada temuan pada target UI yang berubah.
- Pemindaian pola secret source terdahulu tidak menemukan kecocokan; credential GitHub pernah terekspos di sesi lama dan rotasinya belum terkonfirmasi.

## Tindak lanjut

1. Set `AUTH_SECRET` dan `DATABASE_URL` di Vercel; konfirmasi migrasi Neon produksi.
2. Rotasi credential GitHub yang pernah terpapar.
3. Commit/push setelah gate keamanan, deploy, lalu smoke-test route production dan login ber-role.
4. Lengkapi CRUD user dan filter/ekspor laporan bila diminta untuk rilis UKK penuh.
5. Perbarui status ini setiap kali bukti baru diverifikasi.