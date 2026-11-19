import { api, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { deleteCategory } from "@/lib/server/api/categories";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireRole("admin");
    const { id } = await context.params;
    return deleteCategory(actor, id);
  });
}
