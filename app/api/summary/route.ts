import { api, requireRole } from "@/lib/server/api/http";
import { getSummary } from "@/lib/server/api/summary";

export function GET() {
  return api(async () => {
    await requireRole("admin", "petugas");
    return getSummary();
  });
}
