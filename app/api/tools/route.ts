import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { listTools, createTool } from "@/lib/server/api/tools";
export async function GET() { return api(async () => { await requireRole("admin", "petugas", "peminjam"); return listTools(); }); }
export async function POST(request: Request) { return api(async () => { assertSameOrigin(request); const actor = await requireRole("admin", "petugas"); return createTool(actor, await readJson(request)); }, 201); }
