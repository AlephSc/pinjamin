import { api, readJson, requireRole } from "@/lib/server/api/http";
import { decideLoan } from "@/lib/server/api/loans";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return decideLoan(actor, id, await readJson(request));
  });
}
