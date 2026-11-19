# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Admin sekolah mengelola akun, kategori, inventaris, transaksi, laporan, dan log. Petugas memproses persetujuan dan pengembalian. Peminjam melihat alat, mengajukan pinjaman, dan meminta pengembalian. Pengguna bekerja dari browser desktop/laptop; peminjam juga memakai mobile.

## Product Purpose
Pinjamin membuat peminjaman alat sekolah terdokumentasi dan stok dapat dipercaya. Keberhasilan berarti tiap role hanya mengakses tugasnya, transaksi tercatat, stok berubah pada tahap yang benar, dan pengembalian terlambat dihitung otomatis.

## Positioning
Satu ruang kerja sekolah yang menghubungkan akun, inventaris, pengajuan, persetujuan, pengembalian, denda, laporan, dan jejak aktivitas; bukan katalog alat atau formulir yang berdiri sendiri.

## Operating Context
Alur utama: masuk -> ruang kerja sesuai peran -> cari/pilih alat -> ajukan -> petugas setujui/tolak -> peminjam ajukan kembali -> petugas konfirmasi -> laporan/log. Data operasional berasal dari PostgreSQL. Tarif denda implementasi saat ini Rp2.000 per hari keterlambatan. Pengajuan menunggu tidak mengurangi stok; konfirmasi petugas mengembalikan stok.

## Capabilities and Constraints
Next.js App Router, TypeScript, React, PostgreSQL, sesi cookie HttpOnly, otorisasi server, CSRF/origin pada mutasi, dan query berparameter. Role: admin, petugas, peminjam. Route kerja: `/`, `/petugas`, `/admin`; masuk `/masuk`. CRUD alat sudah ada; kategori dan pengguna sedang dilengkapi. Jangan mengganti data transaksi penting dengan penghapusan fisik tanpa alasan; gunakan status/nonaktif dan audit. Tidak ada pembayaran online, SSO, barcode, atau notifikasi eksternal pada versi ini.

## Brand Commitments
Nama produk: Pinjamin. Bahasa antarmuka: Indonesia. Identitas visual yang diminta pengguna: monokrom hitam/putih dengan satu aksen biru sinyal `#4B8DFF`. Aksen dipakai untuk tindakan dan orientasi, bukan dekorasi berlebihan.

## Evidence on Hand
PRD: `docs/PRD.md`; skema: `db/schema.sql`; migrasi: `db/migrations/`; test: `tests/`; aplikasi lokal dan URL produksi `https://pinjamin-aleph.vercel.app/`. Data contoh lama di `lib/store.tsx` bukan bukti operasional produksi. Jangan mengarang jumlah pengguna, testimoni, logo mitra, atau klaim performa.

## Product Principles
1. Status dan stok harus dapat dipercaya sebelum tampilan dihias.
2. Hak akses diputuskan server; UI hanya menampilkan tindakan yang diizinkan.
3. Tugas yang sering dilakukan harus cepat ditemukan dan selesai.
4. Setiap perubahan penting memiliki jejak audit.
5. Informasi kosong, gagal, dan sedang diproses harus jelas serta dapat dipulihkan.

## Accessibility & Inclusion
Target WCAG AA untuk kontras teks, fokus keyboard terlihat, label form eksplisit, target sentuh minimal 44px, status memakai teks selain warna, dan layout tetap berguna pada lebar mobile 360px.
