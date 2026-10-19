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
