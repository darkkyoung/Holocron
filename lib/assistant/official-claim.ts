// Bounded lexical distinction, not semantic entailment. Unknown wording and
// quotations stay conservative; a denial never exempts another occurrence.
const mention=/(?:공식(?:적으로)?\s*(?:[\p{L}\p{N}]{1,20}\s+){0,3}?(?:발표|확정|확인)|\bofficially\s+(?:announced|confirmed)\b)/giu;
const end='(?=\\s*(?:$|[.!?。;,\\n]))';
const koreanDenial=new RegExp('^(?:되지\\s*않(?:았다|았습니다|습니다|았지만|지만)|된\\s*것은\\s*아니(?:다|지만)|(?:이|가|은|는)?\\s*없(?:는\\s*상태다|었다|습니다|다)|된\\s*바\\s*없(?:다|습니다)|된\\s*정보는\\s*없(?:다|습니다))'+end,'u');
const englishDenialPrefix=/(?:^|[.!?;:\n])\s*(?:(?:it|this|the project)\s+(?:is|was|has been)\s+)?not\s+$/iu;
const englishDenialEnd=/^\s*(?:$|[.!?;,\n]|but\b)/iu;

export function hasOfficialClaim(text:string):boolean{
  for(const match of text.matchAll(mention)){
    const after=text.slice(match.index!+match[0].length);
    if(match[0].startsWith('공식')){
      // Only an adjacent, complete denial is exempt. In particular, double
      // negation, quotes and embedded "...없다는 것은 아니다" do not match.
      if(koreanDenial.test(after))continue;
    }else if(englishDenialPrefix.test(text.slice(0,match.index))&&englishDenialEnd.test(after))continue;
    return true;
  }
  return false;
}

// Only guide caveats may use these complete, source-scoped descriptions of what
// the selected summary cannot establish. This is NOT evidence that no announcement
// exists. No arbitrary subject/quotation/clause is allowed inside the exception.
const scopeSource='(?:(?:선택한|선택된)\\s*(?:기사\\s*요약|아카이브\\s*근거|자료|근거)|기사\\s*요약)';
const scopeTopic='공식(?:적인)?\\s*(?:발표|확인|확정)';
const scopeUnknown='(?:확인|판단)할\\s*수\\s*없(?:다|습니다)';
const scopedCaveat=new RegExp(`^(?:${scopeSource}(?:만으로는|에서는|로는)\\s*(?:별도의\\s*)?${scopeTopic}(?:\\s*여부를|를)\\s*${scopeUnknown}|${scopeTopic}\\s*여부는\\s*${scopeSource}에서\\s*${scopeUnknown})$`,'u');
// A denial followed by an unqualified positive confirmation must not hide behind
// its earlier negation. Ambiguous embedded/double negations remain conservative.
const positiveConfirmation=/확정(?:됐|되었|했다|했습니다)/u;
export function hasOfficialCaveatClaim(text:string):boolean{
  return text.split(/[.!?。\n]+/u).some(part=>{
    const sentence=part.trim();
    if(scopedCaveat.test(sentence))return false;
    return hasOfficialClaim(sentence)||positiveConfirmation.test(sentence);
  });
}
