import { api, readJson, requireRole } from "@/lib/server/api/http";
import { createLoan, listLoans } from "@/lib/server/api/loans";

export function GET() {
  return api(async () => {
    const user = await requireRole("admin", "petugas", "peminjam");
    return listLoans(user.role === "peminjam" ? user.id : undefined);
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireRole("peminjam");
    return createLoan(user, await readJson(request));
  }, 201);
}
