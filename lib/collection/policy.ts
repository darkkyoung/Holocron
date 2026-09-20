export const COLLECTION_WINDOW_DAYS=90;
export const COLLECTION_WINDOW_MS=COLLECTION_WINDOW_DAYS*24*60*60*1000;
export const CATEGORIES=['영화','시리즈','게임','애니메이션','컬처','기타'] as const;

export type PublicationDateResult=
  |{kind:'valid';value:string;precision:'instant'|'date'}
  |{kind:'expired';value:string;precision:'instant'|'date'}
  |{kind:'review';value:'';reason:'metadata 문제: 게시일 누락'|'metadata 문제: 게시일 형식 오류'|'metadata 문제: 시간대 없는 게시 시각'};

const namedEntities:Record<string,string>={
  amp:'&',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',lsquo:"'",rsquo:"'",ldquo:'"',rdquo:'"',hellip:'…',
};

export function decodeEntities(value:string){
  return value
    .replace(/&#(x[0-9a-f]+|\d+);?/gi,(_,code)=>String.fromCodePoint(code.toLowerCase().startsWith('x')?parseInt(code.slice(1),16):parseInt(code,10)))
    .replace(/&([a-z]+);/gi,(whole,name)=>namedEntities[name.toLowerCase()]??whole);
}

export function cleanText(value:string){
  return decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
}

function searchable(...values:string[]){
  return cleanText(values.join(' ')).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'");
}

export function editorialReason(title:string,description='',url=''){
  const normalizedTitle=searchable(title);
  const normalizedDescription=searchable(description);
  let path='';
  try{path=new URL(url).pathname.toLowerCase();}catch{}
  if(/\bcharacter[\s_-]+spotlight\b/.test(`${normalizedTitle} ${normalizedDescription} ${path}`))return 'Character Spotlight';
  const titleIsReview=/^review\b/.test(normalizedTitle)||/[\s|:–—-]review(?=\s*(?:[:|–—-]|$))/.test(normalizedTitle);
  const reviewPath=/(^|\/)(?:reviews?|review-[^/]+)(?:\/|$)/.test(path);
  return titleIsReview||reviewPath?'Review 콘텐츠':'';
}

export function mentionsStarWars(...values:string[]){
  return /\bstar[\s\u00a0_-]*wars\b/i.test(searchable(...values));
}

export function isRelevant(trusted:boolean,...values:string[]){
  return trusted||mentionsStarWars(...values);
}

const trackingKeys=new Set(['fbclid','gclid','dclid','mc_cid','mc_eid','ref','ref_src']);
export function normalizeArticleUrl(raw:string){
  try{
    const url=new URL(decodeEntities(raw.trim()));
    if(url.protocol!=='http:'&&url.protocol!=='https:')return '';
    url.protocol='https:';
    url.hostname=url.hostname.toLowerCase().replace(/^www\./,'');
    url.hash='';
    for(const key of [...url.searchParams.keys()])if(key.toLowerCase().startsWith('utm_')||trackingKeys.has(key.toLowerCase()))url.searchParams.delete(key);
    url.searchParams.sort();
    if(url.pathname.length>1)url.pathname=url.pathname.replace(/\/+$/,'');
    return url.toString();
  }catch{return '';}
}

export function hostAllowed(raw:string,hosts:readonly string[]){
  try{const host=new URL(raw).hostname.toLowerCase().replace(/^www\./,'');return hosts.some(allowed=>host===allowed||host.endsWith(`.${allowed}`));}catch{return false;}
}

export function publicationDate(raw:string,now=Date.now()):PublicationDateResult{
  const value=cleanText(raw);
  if(!value)return {kind:'review',value:'',reason:'metadata 문제: 게시일 누락'};
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const parsed=Date.parse(`${value}T00:00:00Z`);
    if(Number.isNaN(parsed)||new Date(parsed).toISOString().slice(0,10)!==value)return {kind:'review',value:'',reason:'metadata 문제: 게시일 형식 오류'};
    return parsed<now-COLLECTION_WINDOW_MS?{kind:'expired',value,precision:'date'}:{kind:'valid',value,precision:'date'};
  }
  const hasTimezone=/(?:Z|[+-]\d{2}:?\d{2}|\b(?:UT|UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\b)\s*$/i.test(value);
  if(!hasTimezone&&/^\d{4}-\d{2}-\d{2}[T\s]/.test(value))return {kind:'review',value:'',reason:'metadata 문제: 시간대 없는 게시 시각'};
  const parsed=Date.parse(value);
  if(Number.isNaN(parsed))return {kind:'review',value:'',reason:'metadata 문제: 게시일 형식 오류'};
  const normalized=new Date(parsed).toISOString();
  return parsed<now-COLLECTION_WINDOW_MS?{kind:'expired',value:normalized,precision:'instant'}:{kind:'valid',value:normalized,precision:'instant'};
}

export function knownUrlSet(urls:readonly string[]){
  return new Set(urls.map(normalizeArticleUrl).filter(Boolean));
}

export async function runIsolated<T,R>(items:readonly T[],handler:(item:T)=>Promise<R>,onError:(item:T,error:unknown)=>R|Promise<R>){
  const results:R[]=[];
  for(const item of items){
    try{results.push(await handler(item));}catch(error){results.push(await onError(item,error));}
  }
  return results;
}

export function validKoreanText(value:unknown,max:number){
  return typeof value==='string'&&value.trim().length>0&&value.trim().length<=max&&/[가-힣]/.test(value);
}
