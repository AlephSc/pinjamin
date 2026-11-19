import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { updateTool, deleteTool } from "@/lib/server/api/tools";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return updateTool(actor, id, await readJson(request));
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireRole("admin", "petugas");
    const { id } = await context.params;
    return deleteTool(actor, id);
  });
}
