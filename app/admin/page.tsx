import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import PinjaminDemo from "@/app/components/PinjaminDemo";

export const metadata = { title: "Admin", description: "Panel kendali administrator Pinjamin." };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "admin") redirect(user.role === "petugas" ? "/petugas" : "/");
  return <PinjaminDemo user={user} />;
}
