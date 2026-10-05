import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const names=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","GEMINI_API_KEY","GEMINI_ANSWER_MODEL","GEMINI_EMBEDDING_MODEL"];
for (const name of names) { const value=process.env[name]; if (!value || /YOUR_|REPLACE_/.test(value)) throw new Error('Required variable missing: '+name); const r=spawnSync('npm.cmd',['exec','--offline','--package=vercel','--','vercel','env','add',name,'production','--scope','singhroshni-2001'],{shell:true,input:value+'\n',encoding:'utf8',timeout:120000,windowsHide:true}); console.log(name+': '+(r.status===0?'configured':'FAILED')); if(r.status!==0)process.exit(1); }
