export function timingSummary(samples:number[]){
 const sorted=samples.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return {n:0,medianMs:null,p95Ms:null,minMs:null,maxMs:null};
 const mid=Math.floor(sorted.length/2);
 return {n:sorted.length,medianMs:sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],minMs:sorted[0],maxMs:sorted[sorted.length-1]};
}
