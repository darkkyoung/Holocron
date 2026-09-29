export type RoadmapItem={title:string;description:string};

export type RoadmapStage={
  id:'available'|'next'|'exploring';
  marker:string;
  label:string;
  title:string;
  note:string;
  items:RoadmapItem[];
};

export const ROADMAP_STAGES:RoadmapStage[]=[
  {
    id:'available',marker:'2026 · NOW',label:'AVAILABLE',title:'지금 탐색할 수 있는 것',
    note:'현재 HOLOCRON에서 바로 만날 수 있습니다.',
    items:[
      {title:'한국어 스타워즈 뉴스 아카이브',description:'여러 매체의 스타워즈 소식을 한국어로 한곳에서 탐색합니다.'},
      {title:'작품 아카이브',description:'공개 예정·최근 공개·기존 스타워즈 작품 정보를 정리합니다.'},
      {title:'데일리 퀴즈',description:'스타워즈를 주제로 한 가벼운 퀴즈와 참여 결과를 제공합니다.'},
    ],
  },
  {
    id:'next',marker:'NEXT',label:'NEXT',title:'다음으로 넓어지는 탐색',
    note:'구체적인 공개일보다, 이어서 발전시킬 방향을 먼저 소개합니다.',
    items:[
      {title:'AI Assistant 확장',description:'HOLOCRON 안의 정보와 관련 자료를 더 쉽게 찾아볼 수 있도록 탐색 경험을 확장합니다.'},
      {title:'퀴즈 아카이브 개선',description:'지난 퀴즈를 더 쉽게 찾아보고 즐길 수 있도록 다듬습니다.'},
      {title:'작품 아카이브 정보 확장',description:'작품마다 확인할 수 있는 정보를 단계적으로 넓혀갑니다.'},
      {title:'뉴스 탐색 경험 개선',description:'검색과 관련 기사 탐색이 더 자연스럽게 이어지도록 개선합니다.'},
    ],
  },
  {
    id:'exploring',marker:'EXPLORING',label:'FUTURE · 아이디어 단계',title:'멀리 바라보는 방향',
    note:'확정된 출시 계획이 아닌, 장기적으로 검토 중인 아이디어입니다.',
    items:[
      {title:'캐릭터 / 인물 아카이브',description:'인물과 캐릭터를 중심으로 작품과 소식을 연결하는 방식을 검토하고 있습니다.'},
      {title:'스타워즈 연표',description:'시대와 사건의 흐름을 따라 이야기를 살펴보는 연표를 구상하고 있습니다.'},
      {title:'개인 맞춤형 기능',description:'관심 작품과 주제를 중심으로 나만의 탐색 흐름을 만드는 아이디어입니다.'},
      {title:'더 깊은 데이터 아카이브',description:'작품과 이야기 사이의 관계를 더 깊게 연결하는 장기 방향입니다.'},
    ],
  },
];
