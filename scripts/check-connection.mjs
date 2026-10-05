import {existsSync} from 'node:fs';
import {writeFile,mkdir} from 'node:fs/promises';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const result={checkedAt:new Date().toISOString(),configuration:'pending',authReachable:null,dataApiReachable:null,anonymousProfileAccessDenied:null,automaticExposure:'requires dashboard/SQL verification',automaticRls:'requires dashboard/SQL verification'};
if(!url||!key||/YOUR_|REPLACE_/i.test(url+' '+key)){
 console.log('Supabase URL/public key still missing or placeholders. No network request made.');
}else{
 let valid=false;
 try{const u=new URL(url);valid=u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')&&u.pathname==='/'&&!u.username&&!u.password;}catch{}
 if(!valid||key.startsWith('sb_secret_'))throw new Error('Invalid Project URL or elevated key in public configuration. Values withheld.');
 if(key.startsWith('eyJ')){let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}if(role!=='anon')throw new Error('Public key must be publishable or legacy anon. Values withheld.');}
 if(!key.startsWith('sb_publishable_')&&!key.startsWith('eyJ'))throw new Error('Unrecognized public key type. Values withheld.');
 result.configuration='present';
 for(const [field,path] of [['authReachable','/auth/v1/settings'],['dataApiReachable','/rest/v1/'],['anonymousProfileAccessDenied','/rest/v1/profiles?select=id&limit=1']]){
  try{const r=await fetch(url.replace(/\/$/,'')+path,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
   const payload=await r.json().catch(()=>({}));
   if(field==='anonymousProfileAccessDenied'){result[field]=r.status===401||r.status===403||payload.code==='42501';result.profileProbeStatus=r.status;}
   else{result[field]=r.ok;result[field+'Status']=r.status;}
  }catch{result[field]=false;result[field+'Error']='Connection failed or timed out; no response body or credentials recorded.';}
 }
}
await mkdir('metrics',{recursive:true});await writeFile('metrics/connection.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
