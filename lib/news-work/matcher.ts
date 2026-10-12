import type {WorkChoice} from './types';

export function normalizeWorkText(value:string){return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/(season|시즌)\s*(\d+)/g,'$1 $2').trim().replace(/\s+/g,' ');}
const generic=new Set(['star wars','스타워즈','스타 워즈']);
function variants(value:string){
  const normalized=normalizeWorkText(value);
  return [...new Set([normalized,normalized.replace(/^(?:star wars|스타워즈|스타 워즈) /,'')])].filter(term=>term.length>=3&&!generic.has(term));
}
function contains(text:string,term:string){
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}]|[은는이가을를의와과에로])`,'u').test(text);
}
export function buildWorkMatchIndex(works:readonly WorkChoice[]){
  const terms=new Map<string,Set<string>>(),stems=new Set<string>();
  for(const work of works)for(const title of [work.title,work.originalTitle])for(const term of variants(title)){
    const stem=term.replace(/\s+(?:season|시즌)\s*\d+\b.*$/u,'').trim();
    if(stem!==term)stems.add(stem);
    // A season row whose title omits its release unit is never guessed.
    if(work.seasonNumber&&!/(?:season|시즌)\s*\d+/u.test(term)){stems.add(term);continue;}
    const ids=terms.get(term)??new Set<string>();ids.add(work.id);terms.set(term,ids);
  }
  return {terms,stems};
}
export function matchArticleWorks(index:ReturnType<typeof buildWorkMatchIndex>,article:{title:string;titleOverride?:string|null;summary:string}){
  const text=normalizeWorkText([article.titleOverride,article.title,article.summary].filter(Boolean).join(' '));
  const matches=[...index.terms].filter(([term])=>contains(text,term));
  const ids=new Set<string>();let ambiguous=false;
  for(const [term,owners] of matches){
    // A more specific season/title wins over a catalog's generic series row.
    if(matches.some(([other])=>other!==term&&other.startsWith(term+' ')))continue;
    if(owners.size!==1){ambiguous=true;continue;}
    if(index.stems.has(term)){ambiguous=true;continue;}
    ids.add([...owners][0]);
  }
  for(const stem of index.stems)if(contains(text,stem)&&!matches.some(([term,owners])=>term.startsWith(stem+' ')&&owners.size===1))ambiguous=true;
  return {workIds:[...ids].sort(),ambiguous};
}
