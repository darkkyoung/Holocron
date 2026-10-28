import {normalizeWorkText} from '../news-work/matcher';

// Bounded lexical normalization, not synonym expansion. Catalog matching still
// runs on the original question before these residual terms are used.
const fillers=new Set(['최근','소식','관련','관련된','관한','대한','대해','뉴스','뭐','있었어','알려줘','알려주세요','정리해줘','정리해주세요','주세요']);
const particles=/(?:으로|에서|에게|에는|와|과|은|는|이|가|을|를|의|에|로)$/u;
export function searchTermVariants(term:string){
  if(!/^[가-힣]+$/u.test(term))return [term];
  const stem=term.replace(particles,'');
  // Keep the original too: a proper name ending in a particle-like syllable
  // must never be destroyed by this deliberately small normalization rule.
  return stem.length>=2&&stem!==term?[term,stem]:[term];
}
export function searchTerms(query:string){
  // Remove copy labels and numbered-list prefixes, not meaningful dates/years.
  const clean=query.replace(/질문\s+복사/gu,' ').replace(/(^|\n)\s*\d{1,2}[.)](?=\s|$)/gu,' ');
  return [...new Set(normalizeWorkText(clean).split(' ').filter(t=>!searchTermVariants(t).some(v=>fillers.has(v))&&(Array.from(t).length>=2||/^\d+$/u.test(t))))].slice(0,12);
}

export function coreSearchTerms(terms:readonly string[]){
  const lexical=terms.filter(t=>!/^\d+$/u.test(t));
  // Numbers retain ranking weight, but cannot alone satisfy a topical query.
  // Standalone years are legitimate searches; stray list digits are not.
  const core=lexical.length?lexical:terms.filter(t=>/^\d{4}$/u.test(t));
  const specific=core.filter(t=>t!=='스타워즈'&&t!=='star'&&t!=='wars');
  return specific.length?specific:core;
}
export function sufficientCoverage(coverage:number,coreCount:number){
  // One specific term suffices for a one-term query; longer queries need a
  // majority (at least two), not an exact phrase or every query word.
  return coreCount>0&&coverage>=Math.max(Math.min(2,coreCount),Math.ceil(coreCount/2));
}
