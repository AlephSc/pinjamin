import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import PinjaminDemo from "@/app/components/PinjaminDemo";
import LoginForm from "@/app/components/LoginForm";
export const metadata={title:"Pinjamin | Peminjaman Alat",description:"Ruang kerja inventaris dan peminjaman alat sekolah."};
export default async function HomePage() {
 const user=await getSessionUser();
 if(user?.role==="admin")redirect("/admin");
 if(user?.role==="petugas")redirect("/petugas");
 if(user)return <PinjaminDemo user={user}/>;
 return <LoginForm/>;
}
