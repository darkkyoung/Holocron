import type {SelectedEvidence} from './prompt';
export type GuideCaveat={text:string;evidenceIds:string[]};
type Article=SelectedEvidence['evidence'][number]['evidence'][number];
// These are bounded lexical observations of the cited projection, not a semantic
// classifier. Labels are constants: source prose/instructions never become output.
const qualifiers:readonly (readonly [string,RegExp])[]=[
  ['논의 중',/논의\s*중/iu],['검토 중',/검토\s*중/iu],['예정',/예정/u],
  ['루머',/루머/u],['추측',/추측/u],['가능성',/가능성/u],
  ['확인되지',/확인되지/u],['확정되지',/확정되지/u],
  ['in talks',/\bin talks\b/iu],['reportedly',/\breportedly\b/iu],
  ['rumor',/\brumou?r\b/iu],['speculation',/\bspeculat(?:ion|ive)\b/iu],
  ['not confirmed',/\bnot (?:officially )?confirmed\b/iu],
  ['not announced',/\bnot (?:officially )?announced\b/iu],['unconfirmed',/\bunconfirmed\b/iu],
];
/** Public caveat shape is unchanged. Wire caveats are always [], including insufficiency. */
export function guideCaveats(status:'ok'|'insufficient_evidence',articles:readonly Article[]):GuideCaveat[]{
  if(status==='insufficient_evidence')return [{text:'선택한 제목·요약만으로 요청한 영상 구성을 뒷받침할 충분한 근거를 확인할 수 없습니다. 정보가 현실에 존재하지 않는다는 뜻은 아닙니다.',evidenceIds:[]}];
  const ids=articles.map(a=>a.evidenceId);
  const result:GuideCaveat[]=[{text:'이 구성은 인용된 기사 제목·요약의 범위에 한정됩니다. 가격·예약·일정·공식 발표는 근거에 명시된 범위에서만 다루고, 그 밖의 정보는 추가 확인하세요. 요약에 없는 정보가 현실에도 없다는 뜻은 아닙니다.',evidenceIds:ids}];
  const qualified=articles.filter(a=>qualifiers.some(([,pattern])=>pattern.test(a.title+' '+a.summary)));
  if(qualified.length){
    const labels=qualifiers.filter(([,pattern])=>qualified.some(a=>pattern.test(a.title+' '+a.summary))).map(([label])=>label);
    result.push({text:`인용 근거에 「${labels.slice(0,6).join(' / ')}」${labels.length>6?' 등':''} 표현이 있습니다. 원문의 문맥·발언 주체·보도 단계를 확인하고, 유보·부정을 확정 주장으로 바꾸지 마세요.`,evidenceIds:qualified.map(a=>a.evidenceId)});
  }
  const uncertainDates=articles.filter(a=>a.orderUncertain);
  if(uncertainDates.length)result.push({text:'이 근거의 게시 순서가 불확실합니다. 최초 보도나 사건의 선후관계를 단정하지 마세요.',evidenceIds:uncertainDates.map(a=>a.evidenceId)});
  if(articles.length>1)result.push({text:'여러 기사 인용은 독립 검증이나 내용 일치를 뜻하지 않습니다. 보도 간 차이는 각 제목·요약과 출처를 대조하세요.',evidenceIds:ids});
  return result;
}
