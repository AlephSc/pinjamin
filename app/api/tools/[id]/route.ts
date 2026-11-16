import { api, readJson, requireRole } from "@/lib/server/api/http";
import { updateTool, deleteTool } from "@/lib/server/api/tools";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return updateTool(actor, id, await readJson(request));
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return deleteTool(actor, id);
  });
}
