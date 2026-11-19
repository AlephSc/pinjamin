import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Pinjamin | Peminjaman Alat", template: "%s · Pinjamin" },
  description: "Ruang kerja inventaris dan peminjaman alat sekolah: pengajuan, persetujuan, pengembalian, denda, dan laporan dalam satu sistem.",
  applicationName: "Pinjamin",
  openGraph: {
    title: "Pinjamin | Peminjaman Alat",
    description: "Ruang kerja inventaris dan peminjaman alat sekolah.",
    siteName: "Pinjamin",
    locale: "id_ID",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
