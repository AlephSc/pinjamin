import { api } from "@/lib/server/api/http";
import { listTools } from "@/lib/server/api/loans";

export function GET() {
  return api(listTools);
}
