import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSummary} from '../lib/metrics';
test('metrics use median and nearest-rank p95 without inventing empty results',()=>{
 assert.deepEqual(timingSummary([]),{n:0,medianMs:null,p95Ms:null,minMs:null,maxMs:null});
 assert.equal(timingSummary([4,1,3,2]).medianMs,2.5);
 assert.equal(timingSummary(Array.from({length:20},(_,i)=>i+1)).p95Ms,19);
 assert.equal(timingSummary([NaN,Infinity,2]).n,1);
});
