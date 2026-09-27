export const SITE_COPY_SETTING_KEY='public_site_copy_v1';

export type SiteCopy={
  newsHeroEyebrow:string;
  newsHeroTitle:string;
  newsHeroHighlight:string;
  newsHeroDescription:string;
  newsSourceDescription:string;
  newsExplainerTitle:string;
  newsExplainerBody:string;
  newsExplainerHint:string;
  newsRailFooterTitle:string;
  newsRailFooterDisclaimer:string;
  siteFooterTagline:string;
  siteFooterLegal:string;
  worksHeroEyebrow:string;
  worksHeroTitle:string;
  worksHeroHighlight:string;
  worksHeroDescription:string;
};

export const DEFAULT_SITE_COPY:SiteCopy={
  newsHeroEyebrow:'A TRANSMISSION FROM A GALAXY FAR, FAR AWAY',
  newsHeroTitle:'은하계의 소식,',
  newsHeroHighlight:'한곳에.',
  newsHeroDescription:'공식 발표부터 새로운 이야기까지. 한국어로 만나는 스타워즈.',
  newsSourceDescription:'서로 다른 시선, 하나의 이야기.',
  newsExplainerTitle:'같은 소식은 하나로.',
  newsExplainerBody:'중복된 보도를 한데 모았습니다. 확인된 게시 시각이 가장 이른 기사를 대표로, 다른 출처도 함께 읽어보세요.',
  newsExplainerHint:'카드 옆 출처를 선택하면 관련 보도를 펼칠 수 있습니다.',
  newsRailFooterTitle:'독립적인 팬 뉴스 아카이브',
  newsRailFooterDisclaimer:'Lucasfilm 및 Disney와 제휴하지 않습니다.',
  siteFooterTagline:'멀리, 저 멀리 은하계에서 온 이야기.',
  siteFooterLegal:'비공식 팬 프로젝트 · 기사와 이미지의 권리는 원저작자에게 있습니다.',
  worksHeroEyebrow:'HOLOCRON / WORKS ARCHIVE',
  worksHeroTitle:'작품의 이야기,',
  worksHeroHighlight:'한곳에.',
  worksHeroDescription:'영화와 드라마, 애니메이션으로 이어지는 스타워즈의 세계.',
};

export const SITE_COPY_LIMITS:Record<keyof SiteCopy,number>={
  newsHeroEyebrow:120,
  newsHeroTitle:80,
  newsHeroHighlight:80,
  newsHeroDescription:240,
  newsSourceDescription:160,
  newsExplainerTitle:100,
  newsExplainerBody:400,
  newsExplainerHint:240,
  newsRailFooterTitle:120,
  newsRailFooterDisclaimer:180,
  siteFooterTagline:160,
  siteFooterLegal:220,
  worksHeroEyebrow:120,
  worksHeroTitle:80,
  worksHeroHighlight:80,
  worksHeroDescription:240,
};

export const SITE_COPY_KEYS=Object.keys(DEFAULT_SITE_COPY) as (keyof SiteCopy)[];

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

export function normalizeSiteCopy(value:unknown):SiteCopy{
  const stored=record(value);
  return Object.fromEntries(SITE_COPY_KEYS.map(key=>{
    const candidate=typeof stored[key]==='string'?stored[key].trim():'';
    return [key,candidate&&candidate.length<=SITE_COPY_LIMITS[key]?candidate:DEFAULT_SITE_COPY[key]];
  })) as SiteCopy;
}

export function validateSiteCopy(value:unknown):SiteCopy{
  const stored=record(value);
  const result={} as SiteCopy;
  for(const key of SITE_COPY_KEYS){
    if(typeof stored[key]!=='string')throw new Error('사이트 문구를 모두 확인해 주세요.');
    const candidate=stored[key].trim();
    if(!candidate)throw new Error('사이트 문구는 비워 둘 수 없습니다.');
    if(candidate.length>SITE_COPY_LIMITS[key])throw new Error(`사이트 문구가 너무 깁니다. 최대 ${SITE_COPY_LIMITS[key]}자까지 입력할 수 있습니다.`);
    result[key]=candidate;
  }
  return result;
}
