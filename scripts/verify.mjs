import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run this script with npm run verify.');
await mkdir('test-results',{recursive:true});await mkdir('metrics',{recursive:true});
const checks=[];
for(const command of ['test','test:db','typecheck','build']){
 const start=performance.now();const r=spawnSync(process.execPath,[npm,'run',command],{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});
 const output=(r.stdout||'')+(r.stderr||'');const log='test-results/verify-'+command.replace(':','-')+'.log';
 await writeFile(log,output);
 checks.push({command:'npm run '+command,passed:r.status===0,exitCode:r.status,elapsedMs:performance.now()-start,log,summary:command==='test'?output.match(/# tests \d+|# pass \d+|# fail \d+/g):null});
 console.log(command+': '+(r.status===0?'PASS':'FAIL')+' (details in '+log+')');
 if(r.status!==0){console.log(output.slice(-5000));break;}
}
const sourceFiles=[];
async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const file=path+'/'+e.name;if(e.isDirectory())await walk(file);else if(/\.(ts|tsx|mjs|css|sql|json)$/.test(file))sourceFiles.push(file);}}
for(const dir of ['app','lib','components','scripts','supabase','tests','samples'])await walk(dir);
sourceFiles.push('package.json','package-lock.json','next.config.ts');
const hash=createHash('sha256');for(const file of sourceFiles.sort()){hash.update(file);hash.update(await readFile(file));}
await writeFile('metrics/verification.json',JSON.stringify({measuredAt:new Date().toISOString(),scope:'LOCAL verification only; no hosted Supabase/Gemini claims',sourceSha256:hash.digest('hex'),checks},null,2)+'\n');
if(checks.some(c=>!c.passed)||checks.length!==4)process.exitCode=1;
