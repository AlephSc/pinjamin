import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata = {
  title: "Pinjamin | Peminjaman Alat",
  description: "Ruang kerja inventaris dan peminjaman alat sekolah."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><StoreProvider>{children}</StoreProvider></body></html>;
}
