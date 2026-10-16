import {AssistantError,unicodeLength} from './types';
import {outputSchema,validateShape,type Fact,type QaOutput,type ScriptOutput} from './output-schema';
import type {SelectedEvidence} from './prompt';
import type {GenerateRequest} from './generate-validation';
import {citationUrl} from './evidence';
const invalid=():never=>{throw new AssistantError('INVALID_OUTPUT',502);};
const unsafe=/(?:<|>|https?:\/\/|www\.|javascript:|data:|\]\(|\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f])/iu;
const announcement=/(?:공식(?:적으로)?\s*(?:발표|확정|확인)|officially\s+(?:announced|confirmed))/iu;
const uncertain=/(?:논의\s*중|검토\s*중|예정|추측|루머|미확정|확정되지|확인되지|아니|않|없|rumou?r|reportedly|in talks|not confirmed)/iu;
const explicit=/(?:공식(?:적으로)?\s*발표|발표했다|발표했습니다|officially announced)/iu;
function prose(value:string){if(unsafe.test(value))invalid();}
function distinct(values:string[]){if(new Set(values).size!==values.length)invalid();}
/** Lexical support checks are deliberately conservative, NOT semantic entailment. */
export function validateGroundedOutput(raw:unknown,input:GenerateRequest,selected:SelectedEvidence){
  validateShape(raw,outputSchema(input.mode));
  const articles=new Map(selected.evidence.flatMap(s=>s.evidence).map(a=>[a.evidenceId,a]));
  const used:string[]=[];
  function references(ids:string[],required=true){
    distinct(ids);if(required&&!ids.length)invalid();
    for(const id of ids){const a=articles.get(id);if(!a?.url||!citationUrl(a.url))invalid();if(!used.includes(id))used.push(id);}
  }
  function fact(f:Fact){
    prose(f.text);references(f.evidenceIds);
    if(!f.supports.length)invalid();
    for(const support of f.supports){
      const a=articles.get(support.evidenceId);
      if(!a||!f.evidenceIds.includes(support.evidenceId)||!a[support.field].includes(support.span)||!support.span.trim())invalid();
    }
    for(const id of f.evidenceIds)if(!f.supports.some(s=>s.evidenceId===id))invalid();
    const spans=f.supports.map(s=>s.span).join(' '),context=f.evidenceIds.map(id=>{const a=articles.get(id)!;return a.title+' '+a.summary;}).join(' ');
    const official=f.supports.some(s=>articles.get(s.evidenceId)!.source.sourceClass==='official'&&explicit.test(s.span)&&!uncertain.test(s.span));
    if((f.certainty==='explicit_announcement'||announcement.test(f.text))&&(!official||uncertain.test(context)||f.certainty!=='explicit_announcement'))invalid();
    if(f.certainty==='explicit_speculation'&&!/(추측|루머|가능성|speculat|rumou?r)/iu.test(spans))invalid();
    if(uncertain.test(context)&&!uncertain.test(f.text))invalid();
    // Obvious invented dates/numbers must not be introduced beyond the support spans.
    for(const number of f.text.match(/\d+(?:[-./]\d+)*/g)??[])if(!spans.includes(number))invalid();
    if(f.evidenceIds.some(id=>articles.get(id)!.orderUncertain)&&/(최초|먼저|first|earliest)/iu.test(f.text))invalid();
  }
  const qa=input.mode==='qa'?raw as QaOutput:null,script=input.mode==='script'?raw as ScriptOutput:null;
  const status=(raw as QaOutput|ScriptOutput).status;
  if(qa){
    for(const limitation of qa.limitations)prose(limitation);
    if(status==='insufficient_evidence'){if(qa.answer.length||!qa.limitations.length)invalid();}
    else if(!qa.answer.length)invalid();
    qa.answer.forEach(fact);if(qa.answer.reduce((n,f)=>n+unicodeLength(f.text),0)>2000)invalid();
  }
  if(script){
    if(status==='insufficient_evidence'){
      if(script.facts.length||script.outline.length||script.draft.length||!script.caveats.length||script.caveats.some(c=>c.evidenceIds.length))invalid();
      script.caveats.forEach(c=>prose(c.text));
    }else{
      if(!script.facts.length||!script.outline.length)invalid();
      distinct(script.facts.map(f=>f.factId));script.facts.forEach(fact);
      const facts=new Map(script.facts.map(f=>[f.factId,f]));
      const resolveFacts=(ids:string[],required=true)=>{distinct(ids);if(required&&!ids.length)invalid();return ids.map(id=>facts.get(id)??invalid());};
      script.caveats.forEach(c=>{prose(c.text);references(c.evidenceIds);if(announcement.test(c.text))invalid();});
      for(const item of script.outline){prose(item.heading);prose(item.creativeNote);resolveFacts(item.factIds);if(announcement.test(item.heading+' '+item.creativeNote))invalid();}
      if(!input.includeDraft&&script.draft.length||input.includeDraft&&!script.draft.length)invalid();
      for(const item of script.draft){
        prose(item.text);
        if(item.kind==='fact'){
          if(item.text!==resolveFacts(item.factIds).map(f=>f.text).join(' '))invalid();
        }else if(item.factIds.length||announcement.test(item.text)||/\d{4}|확정|발표했|출연한다|개봉한다/iu.test(item.text))invalid();
      }
    }
    if(script.facts.reduce((n,f)=>n+unicodeLength(f.text),0)+script.caveats.reduce((n,c)=>n+unicodeLength(c.text),0)+script.outline.reduce((n,o)=>n+unicodeLength(o.heading)+unicodeLength(o.creativeNote),0)>3000||script.draft.reduce((n,d)=>n+unicodeLength(d.text),0)>4000)invalid();
  }
  const strip=(f:Fact)=>({text:f.text,evidenceIds:f.evidenceIds,certainty:f.certainty});
  const result=qa?{answer:qa.answer.map(strip),limitations:qa.limitations}:{facts:script!.facts.map(f=>({factId:f.factId,...strip(f)})),caveats:script!.caveats,outline:script!.outline,draft:script!.draft};
  const evidence=used.map((id,n)=>({citation:n+1,...articles.get(id)!}));
  const usedIds=new Set(evidence.map(a=>a.storyId));
  const storyRow=(s:SelectedEvidence['evidence'][number])=>({storyId:s.storyId,omittedArticleCount:s.omittedArticleCount,orderUncertain:s.orderUncertain,independentVerification:false});
  return {status,mode:input.mode,result,evidence,usedStories:selected.evidence.filter(s=>usedIds.has(s.storyId)).map(storyRow),relatedStories:selected.evidence.filter(s=>!usedIds.has(s.storyId)).map(storyRow),
    warnings:['선택된 최근 90일 아카이브 제목·요약만 사용합니다.','인용·문자열 검사는 사실의 의미적 정확성이나 독립 검증을 보장하지 않습니다.',...(selected.evidence.some(s=>s.omittedArticleCount>0)?['각 소식의 일부 기사만 근거로 사용했습니다.']:[])],archiveWindow:selected.archiveWindow,asOf:selected.asOf};
}
