# Design — Pinjamin

<!-- impeccable:design-schema 1 -->

## Mode
Operate. Pengunjung menyelesaikan tugas inventaris/peminjaman; kejelasan dan konsistensi mengalahkan ekspresi.

## Direction
Meja operasi sekolah yang tenang: monokrom hitam–putih dengan satu aksen biru sinyal. Rasio visual sekitar 60% putih (area kerja), 30% hitam (rail/struktur/teks), 10% biru (aksi utama, navigasi aktif, fokus). Bukan dashboard kartu warna-warni; data dan tindakan berikutnya adalah hierarki.

## Tokens
- `--ink: #101114` — teks utama, rail, struktur gelap.
- `--ink-3: #262932` — hover/layer gelap sekunder.
- `--paper: #ffffff` — permukaan kerja utama.
- `--paper-2: #f6f7f9` — header tabel, chip netral, latar sekunder.
- `--line: #e3e5ea`, `--line-strong: #c9ccd4` — garis dan batas kontrol.
- `--muted: #565b66` — teks sekunder di terang; `--muted-on-dark: #b9bdc7` di rail.
- `--accent: #4b8dff` — aksi utama, item nav aktif, fokus, status disetujui/dipinjam.
- `--accent-strong: #2f6fe0` — hover aksi/link.
- `--accent-soft: #eaf1ff` — cincin fokus dan latar status biru.
- Semantik: `--danger: #b3261e` / `--danger-soft: #fdecea`; `--ok: #1c6b46` / `--ok-soft: #e7f4ec`; `--warn: #8a5a00` / `--warn-soft: #fff3d6`.
- Radius 8px; shadow `0 10px 30px rgba(16,17,20,.08)` hanya untuk elevasi kartu saat hover.
- Font: `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`; satu family untuk UI.

## Type scale
Body 15px/1.5; tabel 14px; label form 13px semibold; judul halaman 28px (mobile 24px) weight 700 tracking -0.02em; judul panel 16px; angka ringkasan 24px tabular-nums. Tidak ada display font terpisah.

## Layout
- Desktop: grid `248px minmax(0,1fr)`; rail sticky full-height; konten max-width 1240px.
- Rail: brand, label “Ruang kerja”, nav ikon+teks, profil dan tombol Keluar di bawah.
- Topbar putih: chip peran + konteks demo bila ada.
- Konten: judul + deskripsi + satu aksi utama; strip ringkasan 4 kolom; tabel/form inline.
- Tablet ≤1080px: rail 208px, kartu 2 kolom, ringkasan 2 kolom.
- Mobile ≤860px: rail menjadi strip horizontal di atas; nav scroll-x; profil+keluar satu baris.
- Mobile ≤620px: form 1 kolom, kartu 1 kolom, aksi utama full-width.

## Components
- Tombol primary biru, secondary putih bergaris, danger solid merah; tinggi minimum 42px (login 46px).
- Link action bergaris bawah dengan ikon 13px; danger link merah.
- Nav item 44px, ikon lucide 17px stroke 1.8; aktif biru solid; badge jumlah putih transparan.
- Tabel: header uppercase 11px di `paper-2`, baris hover sangat halus, status pill berwarna semantik + teks.
- Form inline grid 2 kolom, input 44px, fokus border biru + ring `accent-soft`; pesan error/success dengan ikon dan role alert/status.
- Konfirmasi hapus inline (`alertdialog`), bukan `window.confirm`.
- Empty state menjelaskan langkah berikutnya, bukan sekadar “tidak ada data”.
- Loading: skeleton rail/konten untuk workspace; skeleton khusus login agar form tidak tertahan skeleton workspace.
- Error boundary: pesan aman + kode digest + tombol coba lagi.

## Motion
Transisi 120–160ms pada warna/border/transform ringan; skeleton shimmer 1.4s. `prefers-reduced-motion` mematikan transisi/animasi. Tidak ada animasi masuk halaman yang menunda tugas.

## Accessibility
Kontras teks AA; fokus terlihat 3px biru; label form eksplisit; status memakai teks selain warna; target sentuh ≥44px; `srOnly` untuk label pencarian; tabel dengan `th scope=col`; dialog konfirmasi ber-role dan berlabel.

## Print
Rail/topbar/aksi/form disembunyikan; tabel dan ringkasan dipertahankan dengan break-inside avoid.

## Evidence
- Build produksi Next.js 16 lulus; typecheck lulus; 20 lifecycle + 7 kategori + migration test lulus; smoke route lokal lulus.
- Verifikasi browser lokal: login desktop/mobile, workspace admin (nav/ringkasan/tabel), buat+hapus kategori via UI, daftar alat peminjam, form pengajuan dengan max qty mengikuti alat.
- Detector impeccable: tidak ada temuan pada target UI yang berubah.
- Screenshot: `.impeccable/review/login-desktop.png`, `.impeccable/review/login-mobile.png` (vision tidak tersedia di sesi ini; verifikasi layout dilakukan via DOM/computed style).

## Open items
- CRUD user baru create; edit/nonaktifkan belum ada.
- Laporan belum filter tanggal/status; ekspor CSV/PDF belum ada.
- Production Vercel belum memuat build terbaru; `AUTH_SECRET` harus diset di environment Vercel.
- Sesi JWT stateless belum dicabut server-side saat logout.
