export const ROADMAP_COPY_SETTING_KEY='public_roadmap_copy_v1';
export const ROADMAP_STAGE_IDS=['available','next','exploring'] as const;
export type RoadmapStageId=(typeof ROADMAP_STAGE_IDS)[number];
export type RoadmapItemCopy={title:string;description:string};
export type RoadmapStageCopy={marker:string;label:string;title:string;note:string;items:RoadmapItemCopy[]};
export type RoadmapCopy={
  hero:{coordinates:string;eyebrow:string;titlePrimary:string;titleAccent:string;tagline:string;guide:string};
  stages:Record<RoadmapStageId,RoadmapStageCopy>;
  longTermItemLabel:string;
};

export const ROADMAP_ITEM_COUNTS:Record<RoadmapStageId,number>={available:3,next:4,exploring:4};

export const DEFAULT_ROADMAP_COPY:RoadmapCopy={
  hero:{
    coordinates:'35° N · OUTER RIM ARCHIVE',
    eyebrow:'PUBLIC NAVIGATION CHART',
    titlePrimary:'HOLOCRON',
    titleAccent:'ROADMAP',
    tagline:'뉴스를 모으는 곳에서,\n스타워즈 정보를 탐색하는 곳으로.',
    guide:'현재 이용할 수 있는 기능부터 다음 탐색 방향까지, 하나의 항성 지도를 따라 살펴보세요.',
  },
  stages:{
    available:{
      marker:'2026 · NOW',label:'AVAILABLE',title:'지금 탐색할 수 있는 것',
      note:'현재 HOLOCRON에서 바로 만날 수 있습니다.',
      items:[
        {title:'한국어 스타워즈 뉴스 아카이브',description:'여러 매체의 스타워즈 소식을 한국어로 한곳에서 탐색합니다.'},
        {title:'작품 아카이브',description:'공개 예정·최근 공개·기존 스타워즈 작품 정보를 정리합니다.'},
        {title:'데일리 퀴즈',description:'스타워즈를 주제로 한 가벼운 퀴즈와 참여 결과를 제공합니다.'},
      ],
    },
    next:{
      marker:'NEXT',label:'NEXT',title:'다음으로 넓어지는 탐색',
      note:'구체적인 공개일보다, 이어서 발전시킬 방향을 먼저 소개합니다.',
      items:[
        {title:'AI Assistant 확장',description:'HOLOCRON 안의 정보와 관련 자료를 더 쉽게 찾아볼 수 있도록 탐색 경험을 확장합니다.'},
        {title:'퀴즈 아카이브 개선',description:'지난 퀴즈를 더 쉽게 찾아보고 즐길 수 있도록 다듬습니다.'},
        {title:'작품 아카이브 정보 확장',description:'작품마다 확인할 수 있는 정보를 단계적으로 넓혀갑니다.'},
        {title:'뉴스 탐색 경험 개선',description:'검색과 관련 기사 탐색이 더 자연스럽게 이어지도록 개선합니다.'},
      ],
    },
    exploring:{
      marker:'EXPLORING',label:'FUTURE · 아이디어 단계',title:'멀리 바라보는 방향',
      note:'확정된 출시 계획이 아닌, 장기적으로 검토 중인 아이디어입니다.',
      items:[
        {title:'캐릭터 / 인물 아카이브',description:'인물과 캐릭터를 중심으로 작품과 소식을 연결하는 방식을 검토하고 있습니다.'},
        {title:'스타워즈 연표',description:'시대와 사건의 흐름을 따라 이야기를 살펴보는 연표를 구상하고 있습니다.'},
        {title:'개인 맞춤형 기능',description:'관심 작품과 주제를 중심으로 나만의 탐색 흐름을 만드는 아이디어입니다.'},
        {title:'더 깊은 데이터 아카이브',description:'작품과 이야기 사이의 관계를 더 깊게 연결하는 장기 방향입니다.'},
      ],
    },
  },
  longTermItemLabel:'LONG-TERM IDEA',
};

export const ROADMAP_COPY_LIMITS={
  coordinates:60,eyebrow:100,titlePrimary:80,titleAccent:80,tagline:240,guide:320,
  marker:40,label:60,title:100,note:240,itemTitle:120,itemDescription:320,longTermItemLabel:60,
} as const;

function record(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function field(value:unknown,fallback:string,max:number,strict:boolean,name:string){
  if(typeof value!=='string'){
    if(strict)throw new Error(`${name} 문구를 확인해 주세요.`);
    return fallback;
  }
  const text=value.trim();
  if(!text||text.length>max){
    if(strict)throw new Error(`${name} 문구는 필수이며 최대 ${max}자까지 입력할 수 있습니다.`);
    return fallback;
  }
  return text;
}

function parseRoadmapCopy(value:unknown,strict:boolean):RoadmapCopy{
  const source=record(value),hero=record(source.hero),stages=record(source.stages);
  const defaults=DEFAULT_ROADMAP_COPY;
  const heroCopy={} as RoadmapCopy['hero'];
  for(const key of ['coordinates','eyebrow','titlePrimary','titleAccent','tagline','guide'] as const){
    heroCopy[key]=field(hero[key],defaults.hero[key],ROADMAP_COPY_LIMITS[key],strict,`HERO / ${key}`);
  }
  const stageCopy={} as RoadmapCopy['stages'];
  for(const id of ROADMAP_STAGE_IDS){
    const saved=record(stages[id]),base=defaults.stages[id];
    const items=Array.isArray(saved.items)?saved.items:[];
    if(strict&&items.length!==ROADMAP_ITEM_COUNTS[id])throw new Error(`${id.toUpperCase()} 항목 개수를 확인해 주세요.`);
    stageCopy[id]={
      marker:field(saved.marker,base.marker,ROADMAP_COPY_LIMITS.marker,strict,`${id} / marker`),
      label:field(saved.label,base.label,ROADMAP_COPY_LIMITS.label,strict,`${id} / label`),
      title:field(saved.title,base.title,ROADMAP_COPY_LIMITS.title,strict,`${id} / title`),
      note:field(saved.note,base.note,ROADMAP_COPY_LIMITS.note,strict,`${id} / note`),
      items:base.items.map((item,index)=>{
        const savedItem=record(items[index]);
        return {
          title:field(savedItem.title,item.title,ROADMAP_COPY_LIMITS.itemTitle,strict,`${id} / 항목 ${index+1} 제목`),
          description:field(savedItem.description,item.description,ROADMAP_COPY_LIMITS.itemDescription,strict,`${id} / 항목 ${index+1} 설명`),
        };
      }),
    };
  }
  return {hero:heroCopy,stages:stageCopy,longTermItemLabel:field(source.longTermItemLabel,defaults.longTermItemLabel,ROADMAP_COPY_LIMITS.longTermItemLabel,strict,'장기 아이디어 표시')};
}

export function normalizeRoadmapCopy(value:unknown):RoadmapCopy{return parseRoadmapCopy(value,false);}
export function validateRoadmapCopy(value:unknown):RoadmapCopy{return parseRoadmapCopy(value,true);}
