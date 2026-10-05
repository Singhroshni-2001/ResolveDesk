import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractDocument} from '../lib/extract';
import {pdfFixture} from './pdf-fixture';
const policy='Unused items may be returned in original packaging within thirty days of delivery.';
function file(pages:string[]){return new File([pdfFixture(pages) as BlobPart],'fixture.pdf',{type:'application/pdf'});}
test('real text PDF extraction preserves two actual page numbers',async()=>{const result=await extractDocument(file([policy,policy+' Refunds take five business days.']));assert.equal(result.pageCount,2);assert.deepEqual(result.chunks.map(c=>c.page),[1,2]);assert.match(result.chunks[0].content,/thirty days/);});
test('21-page PDF is rejected even when parser swallows page callback errors',async()=>{await assert.rejects(()=>extractDocument(file(Array(21).fill(policy))),/no more than 20 pages/);});
test('PDF with image-only/blank page is rejected instead of silently dropping it',async()=>{await assert.rejects(()=>extractDocument(file([policy,''])),/Scanned, image-only/);});
