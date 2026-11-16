import PinjaminDemo from "@/app/components/PinjaminDemo";

export const metadata = {
  title: "Admin · Pinjamin",
  description: "Panel kendali administrator Pinjamin.",
};

export default function AdminPage() {
  return <PinjaminDemo initialRole="admin" />;
}
