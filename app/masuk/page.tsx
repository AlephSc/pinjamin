import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import LoginForm from "@/app/components/LoginForm";
export const metadata={title:"Masuk",description:"Masuk ke sistem peminjaman alat sekolah."};
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }){
 const user=await getSessionUser(); if(user) redirect(user.role==="admin"?"/admin":user.role==="petugas"?"/petugas":"/");
 const { error }=await searchParams;
 const code=Array.isArray(error)?error[0]:error;
 return <LoginForm errorCode={code}/>;
}
