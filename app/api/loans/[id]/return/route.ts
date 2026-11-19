import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { returnLoan } from "@/lib/server/api/loans";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{assertSameOrigin(request);const actor=await requireRole("admin","petugas","peminjam");const{id}=await context.params;return returnLoan({ ...actor, role: actor.role },id,await readJson(request));});}
