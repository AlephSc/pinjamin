import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { ApiError } from "@/lib/server/api/errors";
import { decideLoan, listLoans } from "@/lib/server/api/loans";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{assertSameOrigin(request);const actor=await requireRole("admin","petugas");const{id}=await context.params;return decideLoan(actor,id,await readJson(request));});}
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{const actor=await requireRole("admin","petugas","peminjam");const{id}=await context.params;const item=(await listLoans(actor.role==="peminjam"?actor.id:undefined)).find(loan=>loan.id===Number(id));if(!item)throw new ApiError(404,"LOAN_NOT_FOUND","Peminjaman tidak ditemukan.");return item;});}
