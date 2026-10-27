import {unicodeLength} from './types';
import {invalidOutput as invalid} from './output-diagnostic';
import {outputSchema,validateShape,type QaOutput,type ScriptOutput} from './output-schema';
import type {SelectedEvidence} from './prompt';
import type {GenerateRequest} from './generate-validation';
import {citationUrl} from './evidence';
import {hasOfficialClaim} from './official-claim';
import {guideCaveats} from './guide-caveats';

const unsafe=/(?:<|>|https?:\/\/|www\.|javascript:|data:|\]\(|\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f])/iu;
const explicit=/(?:공식(?:적으로)?\s*발표|발표했다|발표했습니다|officially announced)/iu;
const qualified=/(?:미확정|확정되지|확정된.*아니|예정|논의|검토|루머|추측|가능성|미발표|않|없|rumou?r|reportedly|not confirmed)/iu;
const numbers=(text:string)=>text.match(/\d+(?:[.,]\d+)*/g)??[];
type Article=SelectedEvidence['evidence'][number]['evidence'][number];
/** Bounded surface checks, NOT sentence-level proof or semantic entailment.
 * Unrelated uncertainty no longer contaminates every sentence of an answer. */
function prose(text:string,path:string,articles:Article[]){
  if(unsafe.test(text))invalid('UNSAFE_PROSE',path);
  const contexts=articles.map(a=>`${a.title}\n${a.summary}`),context=contexts.join('\n');
  const supportedNumbers=new Set(numbers(context));
  // Ignore list ordinals; a new date/amount in prose still requires archive support.
  const withoutOrdinals=text.replace(/^\s*\d+[.)]\s+/gm,'');
  for(const n of numbers(withoutOrdinals))if(!supportedNumbers.has(n))invalid('UNSUPPORTED_NUMBER',path);
  const official=articles.some(a=>a.source.sourceClass==='official'&&`${a.title}\n${a.summary}`.split(/[.!?。\n]/).some(s=>explicit.test(s)&&!qualified.test(s)));
  // A neutral mention ('공식 발표와 보도를 구분하세요') is not an assertion.
  // Keep the existing adjacent-denial detector, but screen affirmative claims only.
  const affirmative=/(?:발표|확정|확인)(?:됐|되었|했다|했습니다|한다|합니다)|officially\s+(?:announced|confirmed)|않았다는\s*것은\s*아니다|없다는\s*주장은\s*거짓|아니라고\s*할\s*수\s*없/iu;
  if(!official&&text.split(/[.!?。\n]/).some(s=>hasOfficialClaim(s)&&affirmative.test(s)))invalid('OFFICIAL_PROMOTION',path);
  // Only an explicit promotion of the same production action is screened here.
  // This intentionally does not require a hedge on an unrelated independent fact.
  for(const sentence of text.split(/[.!?。\n]/)){
    for(const action of ['제작','출연','개봉','취소']){
      const assertion=new RegExp(`${action}[^.!?。\\n]{0,20}(?:확정|시작(?:됐|했|된|한다)|진행(?:된다|중)|사실(?:이다|로)|한다)`);
      if(!assertion.test(sentence)||qualified.test(sentence))continue;
      const relevant=contexts.flatMap(c=>c.split(/[.!?。\n]/)).filter(s=>s.includes(action));
      if(relevant.some(s=>qualified.test(s))&&!relevant.some(s=>assertion.test(s)&&!qualified.test(s)))invalid('UNCERTAINTY_LOST',path);
    }
  }
}
function distinct(values:string[],path:string){if(new Set(values).size!==values.length)invalid('DUPLICATE_REFERENCE',path);}
export function validateGroundedOutput(raw:unknown,input:GenerateRequest,selected:SelectedEvidence){
  validateShape(raw,outputSchema(input.mode));
  const articles=new Map(selected.evidence.flatMap(s=>s.evidence).map(a=>[a.evidenceId,a]));
  const used:string[]=[];
  function references(ids:string[],path:string,required=true){
    distinct(ids,path);if(required&&!ids.length)invalid('MISSING_REFERENCE',path);
    return ids.map((id,i)=>{
      const a=articles.get(id);if(!a)invalid('UNKNOWN_EVIDENCE',`${path}[${i}]`);
      if(!a!.url||!citationUrl(a!.url))invalid('UNSAFE_CITATION',`${path}[${i}]`);
      if(!used.includes(id))used.push(id);return a!;
    });
  }
  const status=(raw as QaOutput|ScriptOutput).status;
  const qa=input.mode==='qa'?raw as QaOutput:null,planner=input.mode==='script'?raw as ScriptOutput:null;
  let caveats:ReturnType<typeof guideCaveats>=[];
  if(qa){
    const sources=references(qa.evidenceIds,'$.evidenceIds',status==='ok');
    if(status==='insufficient_evidence'&&(qa.evidenceIds.length||!qa.limitations.length))invalid('STATUS_CONTENT','$');
    prose(qa.answer,'$.answer',sources);
    qa.limitations.forEach((value,i)=>prose(value,`$.limitations[${i}]`,sources));
  }
  if(planner){
    if(status==='insufficient_evidence'){
      if(planner.titles.length||planner.recommendations.length||planner.sections.length||!planner.limitations.length)invalid('STATUS_CONTENT','$');
    }else if(planner.titles.length<2||!planner.recommendations.length||planner.sections.length<2)invalid('STATUS_CONTENT','$');
    const recommended=planner.recommendations.map(r=>r.evidenceId);
    const sources=references(recommended,'$.recommendations',status==='ok');
    planner.titles.forEach((value,i)=>prose(value,`$.titles[${i}]`,sources));
    prose(planner.direction,'$.direction',sources);
    for(const [i,item] of planner.recommendations.entries()){
      const path=`$.recommendations[${i}]`,source=[articles.get(item.evidenceId)!];
      if(item.keyPoints.length<2)invalid('STATUS_CONTENT',`${path}.keyPoints`);
      prose(item.reason,`${path}.reason`,source);
      item.keyPoints.forEach((value,j)=>prose(value,`${path}.keyPoints[${j}]`,source));
    }
    for(const [i,item] of planner.sections.entries()){
      const path=`$.sections[${i}]`,sources=references(item.evidenceIds,`${path}.evidenceIds`);
      if(item.evidenceIds.some(id=>!recommended.includes(id)))invalid('UNKNOWN_EVIDENCE',`${path}.evidenceIds`);
      if(item.points.length<2)invalid('STATUS_CONTENT',`${path}.points`);
      for(const key of ['heading','purpose','transition'] as const)prose(item[key],`${path}.${key}`,sources);
      item.points.forEach((value,j)=>prose(value,`${path}.points[${j}]`,sources));
    }
    planner.limitations.forEach((value,i)=>prose(value,`$.limitations[${i}]`,sources));
    const texts=[...planner.titles,planner.direction,...planner.limitations,...planner.recommendations.flatMap(r=>[r.reason,...r.keyPoints]),...planner.sections.flatMap(s=>[s.heading,s.purpose,...s.points,s.transition])];
    if(texts.reduce((n,t)=>n+unicodeLength(t),0)>6000)invalid('TEXT_TOTAL','$');
    caveats=guideCaveats(status,sources);
  }
  const result=qa?{answer:qa.answer,evidenceIds:qa.evidenceIds,limitations:qa.limitations}:{titles:planner!.titles,direction:planner!.direction,recommendations:planner!.recommendations,sections:planner!.sections,limitations:planner!.limitations,caveats};
  const evidence=used.map((id,n)=>({citation:n+1,...articles.get(id)!}));
  const usedIds=new Set(evidence.map(a=>a.storyId));
  const storyRow=(s:SelectedEvidence['evidence'][number])=>({storyId:s.storyId,omittedArticleCount:s.omittedArticleCount,orderUncertain:s.orderUncertain,independentVerification:false});
  return {status,mode:input.mode,result,evidence,usedStories:selected.evidence.filter(s=>usedIds.has(s.storyId)).map(storyRow),relatedStories:selected.evidence.filter(s=>!usedIds.has(s.storyId)).map(storyRow),
    warnings:['선택된 최근 90일 아카이브 제목·요약만 사용합니다.','참고 기사는 답변의 모든 문장에 대한 사실 검증이나 독립 검증을 뜻하지 않습니다.',...(selected.evidence.some(s=>s.omittedArticleCount>0)?['각 소식의 일부 기사만 근거로 사용했습니다.']:[])],archiveWindow:selected.archiveWindow,asOf:selected.asOf};
}
