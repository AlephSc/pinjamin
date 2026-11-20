import { ApiError } from "./errors";
import { requireRole as requireSessionRole } from "@/lib/server/auth";
export { ApiError };
export const requireRole = requireSessionRole;
export function jsonError(error: unknown): Response {
 const known = error instanceof ApiError ? error : null;
 if (!known) console.error("API request failed", error);
 return Response.json({error:{code:known?.code??"INTERNAL_ERROR",message:known?.message??"Terjadi kesalahan pada server."}},{status:known?.status??500,headers:{"Cache-Control":"no-store",...(known?.headers??{})}});
}
export async function api<T>(work:()=>Promise<T>,status=200):Promise<Response>{try{const result=await work();if(result instanceof Response)return result;return Response.json(result,{status,headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error);}}
export async function route<T>(work:()=>Promise<T>,status=200):Promise<Response>{try{const result=await work();if(result instanceof Response)return result;return Response.json(result,{status,headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error);}}
export function objectBody(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new ApiError(400,"INVALID_BODY","Request body must be a JSON object.");return value as Record<string,unknown>;}
export async function readJson(request:Request){try{return objectBody(await request.json());}catch(error){if(error instanceof ApiError)throw error;throw new ApiError(400,"INVALID_JSON","Request body must contain valid JSON.");}}
export function positiveInt(value:unknown,name:string){if(typeof value!=="number"&&(typeof value!=="string"||!/^\d+$/.test(value)))throw new ApiError(400,"INVALID_INPUT",`${name} must be a positive integer.`);const n=typeof value==="number"?value:Number(value);if(!Number.isSafeInteger(n)||n<=0)throw new ApiError(400,"INVALID_INPUT",`${name} must be a positive integer.`);return n;}
export function text(value:unknown,name:string,max:number,optional=false):string|null{if(optional&&value==null)return null;if(typeof value!=="string")throw new ApiError(400,"INVALID_INPUT",`${name} must be text.`);const result=value.trim();if(!result||result.length>max)throw new ApiError(400,"INVALID_INPUT",`${name} must contain 1-${max} characters.`);return result;}
export function isoDate(value:unknown,name:string){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ApiError(400,"INVALID_INPUT",`${name} must use YYYY-MM-DD format.`);const date=new Date(`${value}T00:00:00.000Z`);if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw new ApiError(400,"INVALID_INPUT",`${name} must be a valid calendar date.`);return value;}
export function requestOrigin(request:Request):string{const forwardedHost=request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();const host=forwardedHost||request.headers.get("host")||new URL(request.url).host;const forwardedProto=request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();const proto=forwardedProto||(process.env.NODE_ENV==="production"?"https":"http");return `${proto}://${host}`;}
export function assertSameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin||origin!==requestOrigin(request))throw new ApiError(403,"INVALID_ORIGIN","Same-origin request required.");const site=request.headers.get("sec-fetch-site");if(site&&site!=="same-origin"&&site!=="none")throw new ApiError(403,"INVALID_ORIGIN","Cross-origin requests are not allowed.");}
