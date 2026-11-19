import { api, readJson, requireRole, assertSameOrigin } from "@/lib/server/api/http";
import { createLoan, listLoans } from "@/lib/server/api/loans";
export function GET(){return api(async()=>{const user=await requireRole("admin","petugas","peminjam");return listLoans(user.role==="peminjam"?user.id:undefined);});}
export async function POST(request:Request){return api(async()=>{assertSameOrigin(request);const user=await requireRole("peminjam");const input=await readJson(request);if(input.borrowDate===undefined)input.borrowDate=new Date().toISOString().slice(0,10);return createLoan(user,input);},201);}
