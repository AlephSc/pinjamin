# Login Google (OAuth)

Aplikasi memakai satu OAuth client Google, identitas sama seperti WeBuild.

- Client ID: `512646232463-2t6b87o0acm5qpmq62bkgl1c0cmku7ms.apps.googleusercontent.com`

## Redirect URI yang wajib terdaftar

Google menolak `redirect_uri` yang tidak persis sama dengan yang terdaftar
(error `redirect_uri_mismatch`). Setiap base URL wajib didaftarkan sendiri di
https://console.cloud.google.com/apis/credentials (pilih OAuth client di atas,
lalu *Authorized redirect URIs → + Add URI*):

| Lingkungan | Redirect URI |
| --- | --- |
| Local dev | `https://localhost:3182/api/auth/google/callback` |
| Produksi (Vercel) | `https://pinjamin-six.vercel.app/api/auth/google/callback` |
| Produksi (domain) | `https://pinjamin.leptopia.web.id/api/auth/google/callback` |

Redirect yang dipakai aplikasi diambil dari `GOOGLE_REDIRECT_URI` pada environment
yang bersangkutan — jadi kalau base URL berubah, daftarkan URI yang baru dan
perbarui env-nya. Tidak perlu menambah URI lain.

## Environment

| Nama | Isi |
| --- | --- |
| `GOOGLE_CLIENT_ID` | client ID di atas |
| `GOOGLE_CLIENT_SECRET` | client secret (Google Cloud Console) |
| `GOOGLE_REDIRECT_URI` | redirect URI yang sesuai base URL (tabel di atas) |

Akun Google baru otomatis dibuat dengan role `peminjam` (hardcoded di
`lib/server/google-auth.ts`); email yang sudah terdaftar dengan metode password
dipakai ulang (google_id dilampirkan).

## Setelah login

Arah redirect mengikuti role: admin → `/admin`, petugas → `/petugas`, peminjam → `/`.
