import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import os from 'node:os';
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.test.json'],{stdio:'inherit',windowsHide:true});
const require=createRequire(import.meta.url);
const {extractDocument}=require('../.test-build/lib/extract.js');
const {examples,savedAnswer,policies}=require('../.test-build/lib/domain.js');
const {timingSummary}=require('../.test-build/lib/metrics.js');
const evaluation=JSON.parse(await readFile('tests/rag-evaluation.json','utf8'));
const manifest=[];
const extractionSamples=[];
for(const name of ['returns.md','shipping.md','billing.txt']){
 const bytes=await readFile('samples/'+name);
 const mime=name.endsWith('.md')?'text/markdown':'text/plain';
 const file=new File([bytes],name,{type:mime});
 const result=await extractDocument(file);
 manifest.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,logicalPages:result.pageCount,extractedCharacters:result.characterCount,chunks:result.chunks.length});
 for(let i=0;i<10;i++){const start=performance.now();await extractDocument(file);extractionSamples.push({file:name,ms:performance.now()-start});}
}
const demoQuestions=[...examples.map(question=>({question,expected:'saved-answer'})),...evaluation.map(c=>({question:c.question,expected:'abstention'}))];
const demoResults=demoQuestions.map(q=>{const answer=savedAnswer(q.question);return {...q,actual:answer.citations.length?'saved-answer':'abstention',citations:answer.citations.map(c=>c.title),pass:q.expected===(answer.citations.length?'saved-answer':'abstention')};});
const demoSamples=[];
for(const q of demoQuestions)savedAnswer(q.question);
for(let round=0;round<10;round++)for(const q of demoQuestions){const start=performance.now();savedAnswer(q.question);demoSamples.push(performance.now()-start);}
const result={measuredAt:new Date().toISOString(),scope:'LOCAL ONLY; no external services, no semantic retrieval, no live AI',environment:{node:process.version,platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model},corpus:{documents:manifest.length,logicalPages:manifest.reduce((n,d)=>n+d.logicalPages,0),physicalPdfPages:0,chunks:manifest.reduce((n,d)=>n+d.chunks,0),manifest},demo:{sourceCount:policies.length,results:demoResults,lookupTimings:timingSummary(demoSamples),rawTimingsMs:demoSamples,conditions:'One warm-up per question, then 10 serial rounds. Pure savedAnswer() lookup only; excludes rendering/network/model inference. These are NOT AI response latencies.'},localExtraction:{summary:timingSummary(extractionSamples.map(s=>s.ms)),samples:extractionSamples,conditions:'One warm-up extraction per file, 10 measured serial extractions per file; in-memory UTF-8 TXT/MD only. No PDF, upload, embedding or database cost included.'},live:{status:'not measured by this script; use metrics:live only after account setup'}};
await mkdir('metrics',{recursive:true});
await writeFile('metrics/local.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({documents:result.corpus.documents,logicalPages:result.corpus.logicalPages,chunks:result.corpus.chunks,demoChecks:demoResults.length,passedDemoChecks:demoResults.filter(r=>r.pass).length,output:'metrics/local.json'},null,2));
