import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { createUser } from "@/lib/server/api/users";
export async function POST(request: Request) { return api(async () => { assertSameOrigin(request); const actor = await requireRole("admin"); return createUser(actor, await readJson(request)); }, 201); }
