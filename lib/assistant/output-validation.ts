import {unicodeLength} from './types';
import {invalidOutput as invalid} from './output-diagnostic';
import {outputSchema,validateShape,type Fact,type QaOutput,type ScriptOutput} from './output-schema';
import type {SelectedEvidence} from './prompt';
import type {GenerateRequest} from './generate-validation';
import {citationUrl} from './evidence';
import {hasOfficialClaim} from './official-claim';
import {guideCaveats} from './guide-caveats';
import {uncertain,supportUncertaintyContext} from './uncertainty-context';
const unsafe=/(?:<|>|https?:\/\/|www\.|javascript:|data:|\]\(|\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f])/iu;
const explicit=/(?:공식(?:적으로)?\s*발표|발표했다|발표했습니다|officially announced)/iu;
function prose(value:string,path:string){if(unsafe.test(value))invalid('UNSAFE_PROSE',path);}
function distinct(values:string[],path:string){if(new Set(values).size!==values.length)invalid('DUPLICATE_REFERENCE',path);}
/** Lexical support checks are deliberately conservative, NOT semantic entailment. */
export function validateGroundedOutput(raw:unknown,input:GenerateRequest,selected:SelectedEvidence){
  validateShape(raw,outputSchema(input.mode));
  const articles=new Map(selected.evidence.flatMap(s=>s.evidence).map(a=>[a.evidenceId,a]));
  const used:string[]=[];
  function references(ids:string[],path:string,required=true){
    distinct(ids,path);if(required&&!ids.length)invalid('MISSING_REFERENCE',path);
    for(const [i,id] of ids.entries()){const a=articles.get(id);if(!a)invalid('UNKNOWN_EVIDENCE',`${path}[${i}]`);if(!a!.url||!citationUrl(a!.url))invalid('UNSAFE_CITATION',`${path}[${i}]`);if(!used.includes(id))used.push(id);}
  }
  function fact(f:Fact,path:string){
    prose(f.text,`${path}.text`);references(f.evidenceIds,`${path}.evidenceIds`);
    if(!f.supports.length)invalid('MISSING_SUPPORT',`${path}.supports`);
    for(const [i,support] of f.supports.entries()){
      const a=articles.get(support.evidenceId);
      if(!a||!f.evidenceIds.includes(support.evidenceId))invalid('SUPPORT_REFERENCE',`${path}.supports[${i}].evidenceId`);
      if(!a![support.field].includes(support.span)||!support.span.trim())invalid('SUPPORT_SPAN',`${path}.supports[${i}].span`);
    }
    for(const id of f.evidenceIds)if(!f.supports.some(s=>s.evidenceId===id))invalid('UNCOVERED_EVIDENCE',`${path}.supports`);
    const spans=f.supports.map(s=>s.span).join(' '),context=f.evidenceIds.map(id=>{const a=articles.get(id)!;return a.title+' '+a.summary;}).join(' ');
    const official=f.supports.some(s=>articles.get(s.evidenceId)!.source.sourceClass==='official'&&explicit.test(s.span)&&!uncertain.test(s.span));
    if((f.certainty==='explicit_announcement'||hasOfficialClaim(f.text))&&(!official||uncertain.test(context)||f.certainty!=='explicit_announcement'))invalid('OFFICIAL_PROMOTION',`${path}.certainty`);
    if(f.certainty==='explicit_speculation'&&!/(추측|루머|가능성|speculat|rumou?r)/iu.test(spans))invalid('SPECULATION_SUPPORT',`${path}.certainty`);
    const uncertaintyContext=f.supports.map(s=>{const a=articles.get(s.evidenceId)!;return s.field==='title'?a.title+' '+a.summary:supportUncertaintyContext(a.title,a.summary,s.span);}).join(' ');
    if(uncertain.test(uncertaintyContext)&&!uncertain.test(f.text))invalid('UNCERTAINTY_LOST',`${path}.text`);
    // Obvious invented dates/numbers must not be introduced beyond the support spans.
    for(const number of f.text.match(/\d+(?:[-./]\d+)*/g)??[])if(!spans.includes(number))invalid('UNSUPPORTED_NUMBER',`${path}.text`);
    if(f.evidenceIds.some(id=>articles.get(id)!.orderUncertain)&&/(최초|먼저|first|earliest)/iu.test(f.text))invalid('DATE_ORDER',`${path}.text`);
  }
  const qa=input.mode==='qa'?raw as QaOutput:null,script=input.mode==='script'?raw as ScriptOutput:null;
  const status=(raw as QaOutput|ScriptOutput).status;
  if(qa){
    qa.limitations.forEach((limitation,i)=>prose(limitation,`$.limitations[${i}]`));
    if(status==='insufficient_evidence'){if(qa.answer.length||!qa.limitations.length)invalid('STATUS_CONTENT','$');}
    else if(!qa.answer.length)invalid('STATUS_CONTENT','$.answer');
    qa.answer.forEach((f,i)=>fact(f,`$.answer[${i}]`));if(qa.answer.reduce((n,f)=>n+unicodeLength(f.text),0)>2000)invalid('TEXT_TOTAL','$.answer');
  }
  let caveats:ReturnType<typeof guideCaveats>=[];
  if(script){
    if(status==='insufficient_evidence'){
      if(script.facts.length||script.outline.length||script.draft.length||script.caveats.length)invalid('STATUS_CONTENT','$');
    }else{
      if(!script.facts.length||!script.outline.length)invalid('STATUS_CONTENT','$');
      distinct(script.facts.map(f=>f.factId),'$.facts');script.facts.forEach((f,i)=>fact(f,`$.facts[${i}]`));
      const facts=new Map(script.facts.map(f=>[f.factId,f]));
      const resolveFacts=(ids:string[],path:string,required=true)=>{distinct(ids,path);if(required&&!ids.length)invalid('MISSING_REFERENCE',path);return ids.map((id,i)=>facts.get(id)??invalid('UNKNOWN_FACT',`${path}[${i}]`));};
      for(const [i,item] of script.outline.entries()){const path=`$.outline[${i}]`;prose(item.heading,`${path}.heading`);prose(item.creativeNote,`${path}.creativeNote`);resolveFacts(item.factIds,`${path}.factIds`);if(hasOfficialClaim(item.heading)||hasOfficialClaim(item.creativeNote))invalid('OFFICIAL_PROMOTION',path);}
      if(!input.includeDraft&&script.draft.length||input.includeDraft&&!script.draft.length)invalid('DRAFT_PRESENCE','$.draft');
      for(const [i,item] of script.draft.entries()){
        const path=`$.draft[${i}]`;prose(item.text,`${path}.text`);
        if(item.kind==='fact'){
          if(item.text!==resolveFacts(item.factIds,`${path}.factIds`).map(f=>f.text).join(' '))invalid('DRAFT_FACT_TEXT',`${path}.text`);
        }else if(item.factIds.length||hasOfficialClaim(item.text)||/\d{4}|확정|발표했|출연한다|개봉한다/iu.test(item.text))invalid('CREATIVE_BOUNDARY',path);
      }
    }
    caveats=guideCaveats(status,used.map(id=>articles.get(id)!));
    if(script.facts.reduce((n,f)=>n+unicodeLength(f.text),0)+caveats.reduce((n,c)=>n+unicodeLength(c.text),0)+script.outline.reduce((n,o)=>n+unicodeLength(o.heading)+unicodeLength(o.creativeNote),0)>3000||script.draft.reduce((n,d)=>n+unicodeLength(d.text),0)>4000)invalid('TEXT_TOTAL','$');
  }
  const strip=(f:Fact)=>({text:f.text,evidenceIds:f.evidenceIds,certainty:f.certainty});
  const result=qa?{answer:qa.answer.map(strip),limitations:qa.limitations}:{facts:script!.facts.map(f=>({factId:f.factId,...strip(f)})),caveats,outline:script!.outline,draft:script!.draft};
  const evidence=used.map((id,n)=>({citation:n+1,...articles.get(id)!}));
  const usedIds=new Set(evidence.map(a=>a.storyId));
  const storyRow=(s:SelectedEvidence['evidence'][number])=>({storyId:s.storyId,omittedArticleCount:s.omittedArticleCount,orderUncertain:s.orderUncertain,independentVerification:false});
  return {status,mode:input.mode,result,evidence,usedStories:selected.evidence.filter(s=>usedIds.has(s.storyId)).map(storyRow),relatedStories:selected.evidence.filter(s=>!usedIds.has(s.storyId)).map(storyRow),
    warnings:['선택된 최근 90일 아카이브 제목·요약만 사용합니다.','인용·문자열 검사는 사실의 의미적 정확성이나 독립 검증을 보장하지 않습니다.',...(selected.evidence.some(s=>s.omittedArticleCount>0)?['각 소식의 일부 기사만 근거로 사용했습니다.']:[])],archiveWindow:selected.archiveWindow,asOf:selected.asOf};
}
