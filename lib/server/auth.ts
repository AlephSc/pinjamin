import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { Role, SessionUser } from "@/lib/types";
import { query } from "@/lib/server/db";
import { ApiError } from "./api/errors";
import { requestOrigin } from "./api/http";
type Row<T> = T & QueryResultRow;
type Payload = { id: number; exp: number; v: number };
export const SESSION_COOKIE = "pinjamin_session";
export const LOGIN_CSRF_COOKIE = "pinjamin_login_csrf";
const MAX_AGE = 43200;
const ROLES: Role[] = ["admin", "petugas", "peminjam"];
function secret() { const value=process.env.AUTH_SECRET; if(!value||value.length<32) throw new Error("AUTH_SECRET must be configured (minimum 32 characters)."); return value; }
const mac=(body:string)=>createHmac("sha256",secret()).update(body).digest("base64url");
export function hashPassword(password:string,salt=randomBytes(16).toString("hex")){return `scrypt$${salt}$${scryptSync(password,salt,64).toString("hex")}`;}
function verifyPassword(password:string,encoded:string){const[algorithm,salt,digest]=encoded.split("$");if(algorithm!=="scrypt"||!salt||!digest||!/^[0-9a-f]{128}$/i.test(digest))return false;const expected=Buffer.from(digest,"hex");const actual=scryptSync(password,salt,expected.length);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function issueToken(user:SessionUser,version=1){const body=Buffer.from(JSON.stringify({id:user.id,exp:Math.floor(Date.now()/1000)+MAX_AGE,v:version})).toString("base64url");return `${body}.${mac(body)}`;}
function readToken(token?:string):Payload|null{if(!token||token.length>2048)return null;const[body,signature,extra]=token.split(".");if(!body||!signature||extra)return null;const expected=mac(body);if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;try{const value=JSON.parse(Buffer.from(body,"base64url").toString()) as Payload;if(!Number.isSafeInteger(value.id)||value.id<=0||!Number.isSafeInteger(value.exp)||value.exp<=Math.floor(Date.now()/1000)||!Number.isSafeInteger(value.v)||value.v<1)return null;return value;}catch{return null;}}
async function userForPayload(payload:Payload|null):Promise<SessionUser|null>{if(!payload)return null;const r=await query<Row<SessionUser&{token_version:number}>>("select id,name,email,role,active,token_version from users where id=$1 limit 1",[payload.id]);const row=r.rows[0];return row?.active&&ROLES.includes(row.role)&&Number(row.token_version)===payload.v?{id:Number(row.id),name:row.name,email:row.email,role:row.role}:null;}
function tokenFromRequest(request:Request){return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length+1);}
export async function getSessionUser(){const {cookies}=await import("next/headers");const jar=await cookies();return userForPayload(readToken(jar.get(SESSION_COOKIE)?.value));}
export async function getSessionUserFromRequest(request:Request){return userForPayload(readToken(tokenFromRequest(request)));}
export async function requireRole(...roles:Role[]):Promise<SessionUser>{const user=await getSessionUser();if(!user)throw new ApiError(401,"SESSION_REQUIRED","Silakan masuk untuk melanjutkan.");if(!roles.includes(user.role))throw new ApiError(403,"FORBIDDEN","Peran Anda tidak diizinkan untuk tindakan ini.");return user;}
export async function signIn(email:string,password:string):Promise<{token:string;user:SessionUser}>{const r=await query<Row<SessionUser&{password_hash:string|null;token_version:number}>>("select id,name,email,role,active,password_hash,token_version,provider from users where lower(email)=lower($1) limit 1",[email]);const row=r.rows[0];if(!row||!row.active||!ROLES.includes(row.role)||row.provider!=="password"||!row.password_hash||!verifyPassword(password,row.password_hash))throw new ApiError(401,"INVALID_CREDENTIALS","Email atau kata sandi salah.");const user={id:Number(row.id),name:row.name,email:row.email,role:row.role};return{token:issueToken(user,Number(row.token_version)),user};}
export async function revokeUserSessions(userId:number){await query("update users set token_version=token_version+1 where id=$1",[userId]);}
const LOCAL_SECURE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
function secureCookieForRequest(request:Request){const origin=requestOrigin(request);const host=new URL(origin).hostname.toLowerCase();return process.env.NODE_ENV==="production"||LOCAL_SECURE_HOSTS.has(host);}
export function sessionCookie(token:string,request?:Request){return{name:SESSION_COOKIE,value:token,options:{httpOnly:true,secure:request?secureCookieForRequest(request):process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:MAX_AGE}};}
export function validLoginCsrf(request:Request){const cookie=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${LOGIN_CSRF_COOKIE}=`))?.slice(LOGIN_CSRF_COOKIE.length+1);const header=request.headers.get("x-csrf-token");return !!cookie&&!!header&&cookie.length===header.length&&timingSafeEqual(Buffer.from(cookie),Buffer.from(header));}
export function csrfCookieValue(){return randomBytes(24).toString("base64url");}
export { readToken };
