/** A lexical guard, not an entailment/attribution judge. Keep whole sentences
 * around every exact occurrence (including repeated spans), never the span alone.
 * Titles remain conservative qualifiers of their article. A neighbouring caveat
 * without an explicit subject, or with a connective, applies to the cited sentence.
 * Full-span citations deliberately retain all their original uncertainty. */
export const uncertain=/(?:논의\s*중|검토\s*중|예정|추측|루머|미확정|확정되지|확인되지|아니|않|없|rumou?r|reportedly|in talks|not confirmed|not\s+officially\s+(?:announced|confirmed))/iu;
const connected=/^(?:다만|하지만|그러나|아직|현재까지|이는|이것|그것|이\s*(?:소식|내용|보도|계획|주장)|해당|그\s*(?:소식|내용|계획)|공식|확정|확인|부인|논의|검토|예정|추측|루머|reportedly\b|in talks\b|however\b|but\b|yet\b|this\b|that\b|it\b|not\b|unconfirmed\b)/iu;
// Splitting is intentionally limited; abbreviations/quotes can over-reject, never
// authorize an official claim. The independent official-claim gate is unchanged.
export function supportUncertaintyContext(title:string,text:string,span:string){
  const sentences:{text:string;start:number;end:number}[]=[];
  let start=0;
  for(const match of text.matchAll(/[.!?](?=\s|$)|\n+/gu)){
    const end=match.index+match[0].length;
    sentences.push({text:text.slice(start,end).trim(),start,end});start=end;
  }
  if(start<text.length)sentences.push({text:text.slice(start).trim(),start,end:text.length});
  const selected=new Set<number>();
  for(let at=text.indexOf(span);at>=0;at=text.indexOf(span,at+1)){
    sentences.forEach((s,i)=>{if(s.start<at+span.length&&s.end>at)selected.add(i);});
  }
  if(!selected.size)return title+' '+text; // Ambiguous boundaries fail conservatively.
  const cited=[...selected];
  // Repeated explicit subjects also connect non-adjacent qualifications.
  sentences.forEach((s,j)=>{if(uncertain.test(s.text)&&cited.some(i=>sharedSubject(sentences[i].text,s.text)))selected.add(j);});
  for(const i of selected)for(const j of [i-1,i+1]){
    const neighbour=sentences[j]?.text;
    if(neighbour&&uncertain.test(neighbour)&&connected.test(neighbour))selected.add(j);
  }
  return title+' '+[...selected].sort((a,b)=>a-b).map(i=>sentences[i].text).join(' ');
}

function sharedSubject(left:string,right:string){
  const tokens=(text:string)=>(text.match(/[\p{L}\p{N}]{3,}/gu)??[]).map(t=>t.toLowerCase().replace(/(?:에서|으로|은|는|이|가|을|를|의|에)$/u,''));
  const a=new Set(tokens(left));return tokens(right).some(t=>t.length>=2&&a.has(t));
}
