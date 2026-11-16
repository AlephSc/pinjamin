import { api, requireRole } from "@/lib/server/api/http";
import { listTools } from "@/lib/server/api/loans";

/** Catalog is readable by any signed-in role; keep the guard when session auth lands. */
export function GET() {
  return api(async () => {
    await requireRole("admin", "petugas", "peminjam");
    return listTools();
  });
}
