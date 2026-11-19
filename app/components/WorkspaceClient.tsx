"use client";

import PinjaminWorkspace, { type PinjaminWorkspaceProps } from "./PinjaminWorkspace";

type DataProps = Pick<PinjaminWorkspaceProps, "user" | "tools" | "loans" | "users" | "categories" | "logs">;

async function request(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "X-Requested-With": "fetch", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? `Permintaan gagal (${response.status}).`);
}
const post = (path: string, body: unknown) => request(path, "POST", body);
const patch = (path: string, body: unknown) => request(path, "PATCH", body);

export default function WorkspaceClient(data: DataProps) {
  return <PinjaminWorkspace
    {...data}
    onCreateLoan={async input => post("/api/loans", input)}
    onDecideLoan={async (id, status) => patch(`/api/loans/${id}`, { status })}
    onReturnLoan={async input => post(`/api/loans/${input.loanId}/return`, input)}
    onCreateTool={async input => post("/api/tools", input)}
    onUpdateTool={async input => patch(`/api/tools/${input.id}`, input)}
    onDeleteTool={async id => request(`/api/tools/${id}`, "DELETE")}
    onCreateUser={async input => post("/api/users", input)}
    onCreateCategory={async input => post("/api/categories", input)}
    onDeleteCategory={async id => request(`/api/categories/${id}`, "DELETE")}
  />;
}
