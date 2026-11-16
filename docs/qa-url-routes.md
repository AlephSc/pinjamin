# Laporan Pengujian QA: Verifikasi Route URL, Role Separation, Kontras Sidebar, dan CRUD Barang

Tanggal Pengujian: 16 November 2026  
Lingkungan: Local Dev Server (`http://localhost:3000`)  
Pelaksana: Hermes QA Automated Test & Browser Verification

---

## 1. Ringkasan Eksekutif

Pengujian QA otomatis dan verifikasi browser nyata berhasil dilakukan untuk memastikan pemisahan route URL (`/`, `/admin`, `/petugas`), hak akses/tampilan per peran, kontras warna sidebar menu, dan fungsionalitas CRUD barang (alat) termasuk Edit dan Hapus.

| Parameter Uji | Status | Catatan |
|---|---|---|
| HTTP 200 OK untuk route `/`, `/admin`, `/petugas` | **LULUS** | Respon server HTTP 200 OK pada seluruh target |
| Pemisahan Role & Judul Halaman | **LULUS** | Role, nama pengguna default, dan page title sesuai |
| Tab Navigasi / Sidebar per Peran | **LULUS** | RBAC tab sidebar terfilter sesuai batasan wewenang |
| Kontras Warna Navigasi Sidebar | **LULUS** | Teks `rgb(203, 213, 225)` di atas bg gelap, active tab `rgb(15, 23, 42)` di atas `rgb(56, 189, 248)` |
| CRUD Barang: Tambah Alat | **LULUS** | Alat baru berhasil ditambah dan muncul di daftar |
| CRUD Barang: Edit Alat | **LULUS** | Form edit menampilkan data lama dan berhasil diperbarui |
| CRUD Barang: Hapus Alat | **LULUS** | Konfirmasi hapus berjalan dan alat terhapus dari daftar |
| Batasan Peran pada CRUD Barang | **LULUS** | Peminjam hanya memiliki tombol "Ajukan pinjam", Admin/Petugas memiliki "Edit" & "Hapus" |

---

## 2. Hasil Verifikasi Route URL & Peran

| Route | Role | User Aktif | Page Title | Tab Sidebar yang Ditampilkan |
|---|---|---|---|---|
| `http://localhost:3000/` | `peminjam` | Raka Pratama | 🐴 Pinjamin \| Peminjaman Alat | Ringkasan, Alat, Peminjaman, Pengembalian |
| `http://localhost:3000/admin` | `admin` | Aleph Saputra | Admin · Pinjamin | Ringkasan, Peminjaman, Pengembalian, Alat, Kategori, Pengguna, Laporan, Log aktivitas |
| `http://localhost:3000/petugas` | `petugas` | Dewi Kartika | Petugas · Pinjamin | Ringkasan, Peminjaman, Pengembalian, Alat, Laporan |

### Header Respons
- `GET /admin` menyertakan header custom `x-pinjamin-segment: admin`
- `GET /petugas` menyertakan header custom `x-pinjamin-segment: petugas`

---

## 3. Hasil Uji Kontras Warna Sidebar

Pemeriksaan komputasi gaya CSS (`window.getComputedStyle`) pada navigasi sidebar:
- **Tab Tidak Aktif:**
  - Warna Teks: `rgb(203, 213, 225)` (Slate 300)
  - Background: Transparan di atas sidebar gelap (`var(--ink): #0f172a` / `#17212b`)
  - Kontras: Memenuhi rasio kontras WCAG AA untuk keterbacaan teks normal.
- **Tab Aktif (`.selected` / `aria-current="page"`):**
  - Warna Teks: `rgb(15, 23, 42)` (Slate 900)
  - Background: `rgb(56, 189, 248)` (Sky 400)
  - Kontras: Tingkat kontras sangat tinggi (> 7:1, WCAG AAA).

---

## 4. Hasil Uji Skenario CRUD Barang (Alat)

Pengujian interaksi DOM riil dilakukan via browser automation pada panel Admin & Petugas:

1. **Tambah Alat (Create):**
   - Buka tab `Alat` (`inventory`) sebagai Admin.
   - Klik tombol `Tambah alat`.
   - Mengisi:
     - Nama alat: `Osiloskop Digital Rigol`
     - Kode alat: `ALT-999`
     - Kategori ID: `4`
     - Stok: `5`
   - Klik `Simpan alat`.
   - **Hasil:** Muncul notifikasi `Alat berhasil ditambahkan.`. Kartu alat `Osiloskop Digital Rigol` berhasil dirender di DOM katalog.

2. **Edit Alat (Update):**
   - Pada kartu `Osiloskop Digital Rigol`, klik tombol `Edit`.
   - Form `Edit alat: Osiloskop Digital Rigol` terbuka dengan nilai lama terisi otomatis.
   - Mengubah nama menjadi `Osiloskop Digital Rigol Pro` dan stok menjadi `8`.
   - Klik `Perbarui alat`.
   - **Hasil:** Muncul notifikasi `Data alat berhasil diperbarui.`. Judul kartu ter-update menjadi `Osiloskop Digital Rigol Pro`.

3. **Hapus Alat (Delete):**
   - Pada kartu `Osiloskop Digital Rigol Pro`, klik tombol `Hapus`.
   - Konfirmasi dialog (`window.confirm`) disetujui.
   - **Hasil:** Muncul notifikasi `Alat berhasil dihapus.`. Kartu `Osiloskop Digital Rigol Pro` hilang dari daftar alat aktif.

4. **Validasi Otorisasi UI:**
   - Di route `/` (`peminjam`): Tombol `Edit` dan `Hapus` tidak ditampilkan sama sekali; hanya ada tombol `Ajukan pinjam`.
   - Di route `/admin` dan `/petugas`: Tombol `Edit` dan `Hapus` tersedia dan berfungsi normal.

---

## 5. File Pengujian Otomatis

Skrip automated assertions dibuat di `tests/qa-routes.mjs` dan dapat dijalankan kapan saja dengan:
```bash
node tests/qa-routes.mjs
```
Semua assertion lulus (exit code 0).
