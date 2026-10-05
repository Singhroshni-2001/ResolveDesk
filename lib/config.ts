export function publicSupabaseSettings(url?:string,key?:string){
 if(!key||/YOUR_|REPLACE_/i.test(key))return null;
 if(key.startsWith('sb_secret_'))throw new Error('Use a publishable Supabase key. Secret keys must never use NEXT_PUBLIC_ variables.');
 if(key.startsWith('eyJ')){
  try{const part=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(part));if(payload.role!=='anon')throw new Error();}
  catch{throw new Error('The configured public key is not a valid legacy anon key. Use a publishable key.');}
 }else if(!key.startsWith('sb_publishable_'))throw new Error('Use the publishable key from Supabase Settings > API Keys.');
 if(!url||/YOUR_|REPLACE_/i.test(url))return null;
 try{const parsed=new URL(url);if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.search||parsed.hash||!['','/'].includes(parsed.pathname))throw new Error();}
 catch{throw new Error('Use the API Project URL https://<project-ref>.supabase.co, not the dashboard URL.');}
 return {url:url.replace(/\/$/,''),key};
}
