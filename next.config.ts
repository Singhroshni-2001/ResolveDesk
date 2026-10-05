import type { NextConfig } from 'next';
import {publicSupabaseSettings} from './lib/config';
// Validate before bundling public values. Never include secret/service-role keys.
publicSupabaseSettings(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const config: NextConfig = {turbopack:{root:process.cwd()},serverExternalPackages:['pdf-parse'], poweredByHeader:false, async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}]}]}};
export default config;
