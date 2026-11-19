import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import PinjaminDemo from "@/app/components/PinjaminDemo";

export const metadata = {
  title: "Petugas",
  description: "Panel operasional petugas Pinjamin.",
};

export default async function PetugasPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role === "admin") redirect("/admin");
  if (user.role !== "petugas") redirect("/");
  return <PinjaminDemo user={user} />;
}
