# PRD - Pinjamin

**Versi:** 1.0
**Status:** Draft untuk implementasi
**Target:** UKK Rekayasa Perangkat Lunak 2025/2026
**Judul tugas:** Pengembangan Aplikasi Peminjaman Alat

## 1. Ringkasan / Overview

Pinjamin adalah aplikasi web untuk mengelola inventaris alat dan proses peminjaman secara terstruktur. Aplikasi dipakai oleh Admin, Petugas, dan Peminjam dengan hak akses berbeda. Sistem mencatat data alat, pengajuan, persetujuan, pengembalian, denda, laporan, dan aktivitas pengguna. Aplikasi di-deploy ke Vercel melalui repository GitHub `AlephSc/pinjamin`.

## 2. Latar Belakang & Masalah

Pencatatan peminjaman alat secara manual berisiko menyebabkan data tidak konsisten, stok tidak akurat, pengajuan terlewat, dan pengembalian terlambat tidak terdokumentasi. Petugas membutuhkan alur persetujuan yang jelas, sedangkan admin membutuhkan laporan dan jejak aktivitas. Peminjam membutuhkan cara sederhana untuk melihat alat tersedia, mengajukan pinjaman, serta mengembalikan alat.

## 3. Tujuan & Success Criteria

### Tujuan

- Menyediakan satu sumber data inventaris dan transaksi peminjaman.
- Menerapkan pembatasan akses berdasarkan role.
- Mengurangi kesalahan pencatatan stok dan tanggal pengembalian.
- Menyediakan bukti pengujian sesuai requirement UKK.

### Success criteria

- 3 role dapat login dan hanya mengakses fitur yang diizinkan.
- Admin dapat membuat, membaca, mengubah, dan menghapus user, kategori, serta alat.
- Peminjam dapat mengajukan peminjaman hanya untuk alat dengan stok tersedia.
- Petugas dapat menyetujui atau menolak pengajuan.
- Sistem mencatat pengembalian dan menghitung denda keterlambatan secara benar.
- Stok berkurang saat peminjaman disetujui dan bertambah saat pengembalian dikonfirmasi.
- Laporan dapat difilter dan dicetak dari browser.
- Minimal 5 test case wajib lulus.
- Build produksi Next.js berhasil dan dapat di-deploy ke Vercel.

## 4. Target User

| User | Kebutuhan utama | Perangkat |
|---|---|---|
| Admin | Mengelola seluruh data dan memantau aktivitas | Browser desktop/laptop |
| Petugas | Memproses pengajuan, pengembalian, dan laporan | Browser desktop/laptop |
| Peminjam | Melihat alat, mengajukan pinjaman, mengembalikan alat | Browser desktop/mobile |

**Spesifikasi minimum:** browser modern yang mendukung JavaScript, koneksi internet, dan resolusi minimal 360 px untuk tampilan mobile.

## 5. Fitur & User Stories

Prioritas: **P0** wajib versi pertama, **P1** penting setelah fitur utama stabil, **P2** pengembangan lanjutan.

| ID | Prioritas | Role | User story | Kriteria penerimaan |
|---|---|---|---|---|
| AUTH-01 | P0 | Semua | Saya ingin login agar dapat memakai sistem sesuai role. | Kredensial valid masuk dashboard; kredensial salah ditolak. |
| AUTH-02 | P0 | Semua | Saya ingin logout agar sesi saya aman. | Sesi dihapus dan halaman terlindungi tidak dapat dibuka. |
| AUTH-03 | P0 | Sistem | Saya ingin akses dibatasi berdasarkan role. | Request ke fitur role lain menghasilkan penolakan/redirect. |
| USER-01 | P0 | Admin | Saya ingin CRUD user agar akun dapat dikelola. | Admin dapat tambah, lihat, ubah, nonaktifkan/hapus user. Password disimpan hashed. |
| CAT-01 | P0 | Admin | Saya ingin CRUD kategori agar alat terorganisir. | Kategori dapat dikelola; kategori yang masih dipakai tidak boleh dihapus sembarangan. |
| TOOL-01 | P0 | Admin | Saya ingin CRUD alat agar inventaris akurat. | Nama, kategori, stok, kondisi, dan deskripsi tervalidasi. |
| TOOL-02 | P0 | Peminjam | Saya ingin melihat daftar alat agar tahu alat yang tersedia. | Daftar menampilkan status/stok dan dapat dicari atau difilter. |
| LOAN-01 | P0 | Peminjam | Saya ingin mengajukan peminjaman agar dapat menggunakan alat. | Form memvalidasi alat, jumlah, tanggal, dan tujuan; pengajuan berstatus pending. |
| LOAN-02 | P0 | Petugas | Saya ingin menyetujui/menolak pengajuan agar peminjaman terkendali. | Keputusan tersimpan bersama petugas, waktu, dan catatan. |
| LOAN-03 | P0 | Admin | Saya ingin CRUD data peminjaman agar data dapat dikoreksi secara terkontrol. | Admin dapat melihat dan mengubah data dengan audit aktivitas. |
| RETURN-01 | P0 | Peminjam | Saya ingin mengajukan pengembalian agar transaksi selesai. | Peminjam dapat meminta pengembalian untuk pinjaman aktif. |
| RETURN-02 | P0 | Petugas | Saya ingin memantau dan mengonfirmasi pengembalian agar kondisi alat tercatat. | Petugas mencatat tanggal, kondisi, jumlah, catatan, dan denda. |
| RETURN-03 | P0 | Admin | Saya ingin CRUD pengembalian agar data dapat dikelola. | Admin dapat melihat/mengoreksi data sesuai aturan dan tercatat di log. |
| REPORT-01 | P0 | Petugas | Saya ingin melihat dan mencetak laporan agar dapat membuat rekap. | Laporan dapat difilter berdasarkan tanggal/status dan dicetak. |
| LOG-01 | P0 | Admin | Saya ingin melihat log aktivitas agar perubahan dapat ditelusuri. | Log memuat user, aksi, objek, waktu, dan ringkasan perubahan. |
| FINE-01 | P0 | Sistem | Saya ingin menghitung denda otomatis agar keterlambatan konsisten. | Denda = hari terlambat x tarif harian; tidak terlambat menghasilkan nol. |
| REPORT-02 | P1 | Admin | Saya ingin melihat statistik inventaris dan transaksi. | Dashboard menampilkan ringkasan alat, pinjaman aktif, terlambat, dan denda. |
| NOTIF-01 | P1 | User | Saya ingin melihat notifikasi status pengajuan. | Perubahan status tampil di aplikasi. |
| EXPORT-01 | P1 | Petugas | Saya ingin mengunduh laporan sebagai CSV/PDF. | File berisi data sesuai filter aktif. |
| PROFILE-01 | P2 | Semua | Saya ingin mengubah profil dan password. | Perubahan tervalidasi dan memerlukan password lama bila relevan. |

## 6. Aturan Bisnis

1. Role yang tersedia: `admin`, `petugas`, `peminjam`.
2. User nonaktif tidak dapat login.
3. Alat memiliki stok total, stok tersedia, kategori, kondisi, dan status aktif.
4. Pengajuan baru berstatus `pending`.
5. Petugas dapat mengubah pengajuan menjadi `approved` atau `rejected`.
6. Saat disetujui, sistem memvalidasi stok dan mengurangi stok tersedia dalam transaksi database.
7. Pinjaman aktif berstatus `borrowed` sampai pengembalian dikonfirmasi.
8. Peminjam tidak dapat meminjam melebihi stok tersedia.
9. Pengembalian dapat berstatus `requested`, `returned`, atau `rejected`.
10. Denda dihitung dari tanggal kembali aktual dibandingkan tanggal jatuh tempo.
11. Rumus denda: `max(0, tanggal_kembali - tanggal_jatuh_tempo) x tarif_denda_harian`.
12. Pengubahan stok/transaksi penting harus atomic dan dicatat pada log aktivitas.
13. Data transaksi tidak dihapus secara fisik jika sudah memiliki riwayat penting; gunakan status/nonaktif bila diperlukan.

## 7. Non-Functional Requirements

### Performa

- Halaman utama dan dashboard memuat tanpa query berulang yang tidak perlu.
- Query daftar menggunakan pagination/limit.
- Target response server normal: kurang dari 2 detik pada koneksi sekolah yang stabil.
- Gunakan index untuk kolom role, status, tanggal, kategori, dan foreign key.

### Keamanan

- Password di-hash, tidak disimpan plaintext.
- Validasi input di server; validasi client hanya untuk UX.
- Authorization dilakukan di server, bukan hanya menyembunyikan tombol.
- Gunakan session/cookie aman dan CSRF protection sesuai mekanisme Next.js.
- Gunakan parameterized query/ORM untuk mencegah SQL injection.
- Secret database hanya di environment variable Vercel.
- Jangan menyimpan password, secret, atau `.env` ke GitHub.
- Semua aksi mutasi penting masuk `activity_logs`.

### Reliabilitas data

- Perubahan transaksi stok menggunakan database transaction.
- Kegagalan sebagian proses harus rollback.
- Foreign key dan constraint mencegah data yatim.

### Aksesibilitas dan UX

- Form memiliki label, pesan error, dan fokus keyboard yang jelas.
- Kontras teks dan tombol terbaca.
- Layout usable pada desktop dan mobile.
- Status transaksi memakai teks, bukan warna saja.

### Deployment

- Push ke branch utama memicu deployment Vercel.
- Build production wajib berhasil sebelum merge.
- Database produksi menggunakan PostgreSQL hosted.

## 8. Platform & Teknologi

- Framework: **Next.js terbaru yang stabil saat implementasi**.
- Bahasa: TypeScript.
- Runtime: Node.js LTS yang didukung Vercel.
- UI: React bawaan Next.js, CSS lokal atau utility CSS ringan.
- Database: PostgreSQL, rekomendasi Neon untuk integrasi serverless Vercel.
- Akses database: ORM/query builder yang kompatibel dengan serverless; pilih satu saat implementasi, tanpa menambah abstraksi yang tidak diperlukan.
- Authentication: session-based authentication dengan cookie HTTP-only.
- Hosting: Vercel.
- Source control: GitHub `AlephSc/pinjamin`.
- Diagram: Mermaid atau draw.io.

## 9. UI/UX Ringkas

### Layar

1. Login.
2. Dashboard berdasarkan role.
3. Daftar dan form user.
4. Daftar dan form kategori.
5. Daftar dan form alat.
6. Daftar alat untuk peminjam.
7. Form pengajuan peminjaman.
8. Daftar pengajuan/pinjaman.
9. Detail peminjaman.
10. Form pengembalian dan konfirmasi petugas.
11. Laporan dengan filter dan tombol cetak.
12. Log aktivitas admin.

### Alur utama

`Login -> Dashboard -> pilih modul -> validasi server -> simpan transaksi -> tampilkan notifikasi -> catat log`

### Navigasi role

- Admin: Dashboard, User, Kategori, Alat, Peminjaman, Pengembalian, Log Aktivitas.
- Petugas: Dashboard, Pengajuan, Pengembalian, Laporan.
- Peminjam: Dashboard, Daftar Alat, Peminjaman Saya, Pengembalian.

## 10. Data Model Minimum

- `users`: id, name, username/email, password_hash, role, active, created_at, updated_at.
- `categories`: id, name, description, active, timestamps.
- `tools`: id, category_id, code, name, description, total_stock, available_stock, condition, active, timestamps.
- `loans`: id, borrower_id, approved_by, status, requested_at, approved_at, due_at, purpose, notes, timestamps.
- `loan_items`: id, loan_id, tool_id, quantity, returned_quantity.
- `returns`: id, loan_id, confirmed_by, requested_at, returned_at, condition, late_days, fine_amount, notes.
- `activity_logs`: id, user_id, action, entity_type, entity_id, metadata, created_at.

Semua id memakai UUID atau integer auto-increment yang konsisten. Foreign key, unique constraint, check constraint, index, trigger, function, dan procedure didokumentasikan pada `database.sql`.

## 11. Edge Cases & Error Handling

| Kondisi | Perilaku sistem |
|---|---|
| Password salah | Tolak login dengan pesan umum; jangan mengungkap akun mana yang benar. |
| User nonaktif | Tolak login. |
| Session kedaluwarsa | Redirect ke login dan tampilkan pesan sesi berakhir. |
| Role mengakses URL terlarang | Return 403 atau redirect sesuai alur. |
| Stok berubah saat pengajuan diproses | Transaksi gagal/ditolak; stok tidak boleh negatif. |
| Tanggal jatuh tempo sebelum tanggal pinjam | Tolak validasi. |
| Jumlah pinjaman nol/negatif | Tolak validasi. |
| Alat nonaktif | Tidak dapat dipilih untuk pengajuan baru. |
| Pengembalian ganda | Tolak dan tampilkan status transaksi saat ini. |
| Pengembalian terlambat | Hitung denda otomatis dan tampilkan rinciannya. |
| Database/network error | Tampilkan pesan aman; rollback transaksi; log error server. |
| Data tidak ditemukan | Tampilkan 404/empty state, bukan error mentah. |
| Submit berulang | Gunakan validasi status dan transaction agar tidak menggandakan transaksi. |

## 12. Testing Minimum

1. Login dengan username/password valid berhasil.
2. Login dengan password salah gagal dan tidak membuat session.
3. Admin menambah alat; alat tampil pada daftar.
4. Peminjam mengajukan alat dengan stok tersedia; status menjadi `pending`.
5. Petugas menyetujui pengajuan; stok tersedia berkurang.
6. Peminjam/petugas memproses pengembalian; stok bertambah.
7. Pengembalian terlambat menghasilkan denda yang benar.
8. Peminjam tidak dapat membuka halaman admin.
9. Pengajuan saat stok habis ditolak.
10. Kegagalan transaksi tidak meninggalkan perubahan stok parsial.

Bukti testing berupa test case, hasil aktual, status lulus/gagal, dan screenshot untuk kebutuhan UKK.

## 13. Out of Scope Versi 1.0

- Aplikasi mobile native.
- Pembayaran denda online.
- Email, WhatsApp, atau push notification eksternal.
- Multi-cabang dan multi-gudang.
- Integrasi barcode/RFID.
- Import data Excel massal.
- SSO Google.
- Chat internal.
- Offline-first/PWA penuh.
- Analitik lanjutan dan machine learning.

## 14. Roadmap Rilis

### v0.1 - Fondasi

- Struktur Next.js dan TypeScript.
- Database schema dan seed data.
- Authentication, session, dan authorization.
- Layout dashboard role.

### v0.2 - Fitur inti

- CRUD user, kategori, alat.
- Daftar alat.
- Pengajuan dan persetujuan peminjaman.
- Pengembalian dan denda.
- Activity log.

### v1.0 - UKK ready

- Laporan dan print view.
- Error handling.
- Testing minimal dan screenshot.
- ERD, flowchart, dokumentasi modul.
- File SQL final.
- Deployment Vercel dan README.

### v1.1 - Peningkatan

- Dashboard statistik.
- Notifikasi in-app.
- Export CSV/PDF.
- Profile dan penggantian password.

## 15. Asumsi dan Keputusan yang Masih Perlu Dikunci

> Asumsi: PostgreSQL Neon dipilih karena kompatibel dengan deployment serverless Vercel.

> Asumsi: Petugas mengonfirmasi pengembalian; peminjam hanya mengajukan pengembalian.

> Asumsi: Satu transaksi dapat berisi lebih dari satu jenis alat, sehingga digunakan tabel `loan_items`.

> Asumsi: Tarif denda harian disimpan sebagai konfigurasi sistem atau nilai tetap yang ditentukan saat implementasi.

> Asumsi: Admin boleh mengoreksi data transaksi, tetapi koreksi dicatat pada activity log.

> Keputusan berikutnya: nilai tarif denda, format kode alat, apakah user memakai username atau email, dan ORM/query layer yang digunakan.

## 16. Deliverables

- Source code lengkap di repository GitHub.
- File database `.sql` berisi schema, seed, function, procedure, trigger, dan contoh transaksi.
- ERD.
- Flowchart/pseudocode login, peminjaman, pengembalian, dan denda.
- Dokumentasi modul: input, proses, output, fungsi/procedure/method.
- Test case, hasil testing, dan screenshot.
- Dokumentasi debugging.
- Laporan evaluasi fitur, bug, dan rencana pengembangan.
- URL deployment Vercel.
