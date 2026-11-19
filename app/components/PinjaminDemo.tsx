import { redirect } from "next/navigation";
import WorkspaceClient from "./WorkspaceClient";
import { getSessionUser } from "@/lib/server/auth";
import { listTools } from "@/lib/server/api/tools";
import { listCategories } from "@/lib/server/api/categories";
import { listLoans } from "@/lib/server/api/loans";
import { query } from "@/lib/server/db";
import type { LogEntry, SessionUser, User } from "@/lib/types";
type Row = Record<string, unknown>;
export default async function PinjaminDemo({ user: supplied }: { user?: SessionUser }) {
  const user = supplied ?? await getSessionUser(); if (!user) redirect("/masuk");
  const [tools, loans, users, categories, logs] = await Promise.all([
    listTools(), listLoans(user.role === "peminjam" ? user.id : undefined),
    user.role === "admin" ? query<Row>("select id,name,email,role,active from users order by name") : Promise.resolve({ rows: [] }),
    listCategories(),
    user.role === "admin" ? query<Row>("select id,actor_name as actor,action,target,to_char(created_at at time zone 'UTC','YYYY-MM-DD HH24:MI') as at from activity_logs order by created_at desc limit 100") : Promise.resolve({ rows: [] }),
  ]);
  const mappedUsers: User[] = users.rows.map(r => ({id:Number(r.id),name:String(r.name),email:String(r.email),role:r.role as User["role"],active:Boolean(r.active)}));
  const mappedLogs: LogEntry[] = logs.rows.map(r => ({id:Number(r.id),actor:String(r.actor),action:String(r.action),target:String(r.target),at:String(r.at)}));
  return <WorkspaceClient user={user} tools={tools} loans={loans} users={mappedUsers} categories={categories} logs={mappedLogs} />;
}
