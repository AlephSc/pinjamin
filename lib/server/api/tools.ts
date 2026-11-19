import type { QueryResultRow } from "pg";
import type { Tool } from "@/lib/types";
import { query, withTransaction } from "@/lib/server/db";
import { ApiError, positiveInt, text } from "./http";
type Row<T> = T & QueryResultRow;
type Actor = { id: number; name: string };
const TOOL_SELECT = `SELECT t.id,t.code,t.name,t.category_id AS "categoryId",c.name AS category,t.stock,t.available,t.condition,t.active FROM tools t JOIN categories c ON c.id=t.category_id`;
export async function listTools(): Promise<Tool[]> { const { rows } = await query<Row<Tool>>(`${TOOL_SELECT} WHERE t.active=true ORDER BY t.name,t.id`); return rows; }
export async function createTool(actor: Actor, input: Record<string, unknown>): Promise<Tool> {
  const name=text(input.name,"name",120)!; const code=text(input.code,"code",32)!; const categoryId=positiveInt(input.categoryId,"categoryId"); const stock=positiveInt(input.stock,"stock"); const condition=text(input.condition,"condition",50)!;
  return withTransaction(async client => {
    const category = await client.query("SELECT id FROM categories WHERE id=$1", [categoryId]);
    if (!category.rowCount) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan.");
    const inserted=await client.query<Row<{id:number}>>("INSERT INTO tools(code,name,category_id,stock,available,condition) VALUES($1,$2,$3,$4,$4,$5) RETURNING id",[code,name,categoryId,stock,condition]);
    await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)",[actor.id,actor.name,"Menambahkan alat",code]);
    const result=await client.query<Row<Tool>>(`${TOOL_SELECT} WHERE t.id=$1`,[inserted.rows[0].id]); return result.rows[0];
  });
}
export async function updateTool(actor: Actor,idInput:string,input:Record<string,unknown>):Promise<Tool>{
 const id=positiveInt(idInput,"id");const name=input.name!==undefined?text(input.name,"name",120)!:undefined;const code=input.code!==undefined?text(input.code,"code",32)!:undefined;const categoryId=input.categoryId!==undefined?positiveInt(input.categoryId,"categoryId"):undefined;const stock=input.stock!==undefined?positiveInt(input.stock,"stock"):undefined;const condition=input.condition!==undefined?text(input.condition,"condition",50)!:undefined;
 if(name===undefined&&code===undefined&&categoryId===undefined&&stock===undefined&&condition===undefined)throw new ApiError(400,"INVALID_INPUT","Minimal satu kolom perubahan wajib diisi.");
 return withTransaction(async client=>{const found=await client.query<Row<{code:string;stock:number;available:number;active:boolean}>>("SELECT code,stock,available,active FROM tools WHERE id=$1 FOR UPDATE",[id]);const old=found.rows[0];if(!old?.active)throw new ApiError(404,"TOOL_NOT_FOUND","Alat tidak ditemukan.");
 if(categoryId!==undefined&&!(await client.query("SELECT id FROM categories WHERE id=$1",[categoryId])).rowCount)throw new ApiError(404,"CATEGORY_NOT_FOUND","Kategori tidak ditemukan.");
 const borrowed=old.stock-old.available; if(stock!==undefined&&stock<borrowed)throw new ApiError(409,"INVALID_STOCK","Stok tidak boleh kurang dari unit yang sedang dipinjam.");
 await client.query("UPDATE tools SET code=COALESCE($1,code),name=COALESCE($2,name),category_id=COALESCE($3,category_id),stock=COALESCE($4,stock),available=COALESCE($5,available),condition=COALESCE($6,condition) WHERE id=$7",[code??null,name??null,categoryId??null,stock??null,stock===undefined?null:stock-borrowed,condition??null,id]);
 await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)",[actor.id,actor.name,"Mengubah data alat",code??old.code]); return (await client.query<Row<Tool>>(`${TOOL_SELECT} WHERE t.id=$1`,[id])).rows[0];});
}
export async function deleteTool(actor: Actor,idInput:string){const id=positiveInt(idInput,"id");return withTransaction(async client=>{const r=await client.query<Row<{code:string;active:boolean}>>("SELECT code,active FROM tools WHERE id=$1 FOR UPDATE",[id]);const tool=r.rows[0];if(!tool?.active)throw new ApiError(404,"TOOL_NOT_FOUND","Alat tidak ditemukan atau sudah nonaktif.");const loans=await client.query("SELECT count(*)::int AS count FROM loans WHERE tool_id=$1 AND status IN ('pending','approved','borrowed','late')",[id]);if(Number(loans.rows[0]?.count)>0)throw new ApiError(409,"ACTIVE_LOANS_EXIST","Alat dengan peminjaman aktif tidak dapat dinonaktifkan.");await client.query("UPDATE tools SET active=false WHERE id=$1",[id]);await client.query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)",[actor.id,actor.name,"Menonaktifkan alat",tool.code]);return{id,code:tool.code,active:false as const};});}
