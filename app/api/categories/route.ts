import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { createCategory, listCategories } from "@/lib/server/api/categories";

export async function GET() {
  return api(async () => { await requireRole("admin", "petugas", "peminjam"); return listCategories(); });
}

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const actor = await requireRole("admin");
    return createCategory(actor, await readJson(request));
  }, 201);
}
