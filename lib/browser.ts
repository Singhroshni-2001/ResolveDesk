import { createClient } from "@supabase/supabase-js";
import { publicSupabaseSettings } from './config';
let client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const settings=publicSupabaseSettings(url,key);
  if(!settings)return null;
  return (client ??= createClient(settings.url, settings.key));
}
export async function api(path: string, options: RequestInit = {}) {
  const session = await supabase()?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Please sign in to use your live workspace.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response:Response;
  try{response=await fetch(`/api/${path}`, { ...options, headers,signal:options.signal||AbortSignal.timeout(65000) });}
  catch{throw new Error('The workspace did not respond. Please check your connection and retry.');}
  const data = await response.json().catch(()=>({error:'The workspace returned an unreadable response. Please retry.'}));
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
