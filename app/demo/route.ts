import type { Role } from "@/lib/types";
import { ApiError, api } from "@/lib/server/api/http";

const roles: Role[] = ["admin", "petugas", "peminjam"];

export async function GET(request: Request) {
  return api(async () => {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") as Role | null;
    if (!role || !roles.includes(role)) throw new ApiError(400, "INVALID_ROLE", "Pilih peran demo yang valid.");
    throw new ApiError(404, "NOT_AVAILABLE", "Login demo dinonaktifkan.");
  });
}
