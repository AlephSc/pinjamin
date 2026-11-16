import { api, readJson, requireRole } from "@/lib/server/api/http";
import { returnLoan } from "@/lib/server/api/loans";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return returnLoan(actor, id, await readJson(request));
  });
}
