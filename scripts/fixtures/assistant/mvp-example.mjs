// Entirely synthetic editorial material for UI/contract tests; not live archive news.
export const exampleArticles=[
 {title:'스타파이터 제작 현장: 모형을 활용한 촬영 접근법',summary:'매체의 현장 보도에 따르면 제작진은 모형을 활용한 촬영 접근법을 설명했다. 장면의 질감과 현장 협업이 주요 화제였다.'},
 {title:'스타파이터의 새로운 인물을 소개하는 제작진 인터뷰',summary:'인터뷰에서 제작진은 새로운 인물을 통해 이야기를 전하고 싶다고 설명했다. 인물의 세부 설정과 줄거리는 공개하지 않았다.'},
 {title:'스타파이터 후속 소식: 공개 일정은 검토 중',summary:'매체는 후속 공개 일정이 검토 중이라고 전했다. 확정 일정과 흥행 수치는 제시하지 않았다.'},
].map((a,i)=>({...a,evidenceId:'example-'+i,articleId:'example-'+i,storyId:'example-story-'+i,url:'https://example.invalid/news/'+i,published:'2026-10-27',category:'영화',source:{id:'deadline',label:'합성 보도 자료',sourceClass:'media',displayClass:'언론 보도',certainty:'unclear'},orderUncertain:false,truncated:{title:false,summary:false}}));
export const exampleQa={status:'ok',answer:'선택한 소식은 스타파이터의 촬영 접근법과 새로운 인물에 초점을 맞추고 있습니다.\n\n• 현장 보도에서는 모형을 활용한 촬영과 제작진의 협업을 소개했습니다.\n• 인터뷰에서는 새로운 인물을 통해 이야기를 전달하고 싶다는 방향을 설명했지만, 세부 줄거리는 공개하지 않았습니다.\n• 후속 공개 일정은 검토 중이라는 보도입니다. 선택한 자료만으로 확정 일정이나 흥행 전망을 단정하기는 어렵습니다.',evidenceIds:exampleArticles.map(a=>a.evidenceId),limitations:['기사 제목·요약으로 확인할 수 있는 내용만 정리했습니다.']};
export const examplePlanner={status:'ok',titles:['모형에서 인물까지: 스타파이터 소식 읽기','스타파이터 제작진이 전한 이야기의 방향','보도된 내용과 기다려야 할 소식'],direction:'촬영 방식과 이야기의 방향을 먼저 소개하고, 일정처럼 확인을 기다려야 하는 내용은 마지막에 분리합니다.',
 recommendations:[
  {evidenceId:'example-0',reason:'영상의 도입에서 제작 현장의 구체적인 접근법을 소개할 수 있습니다.',keyPoints:['매체는 제작진의 모형 활용 촬영 접근법을 소개했습니다.','장면의 질감과 현장 협업이 주요 화제였습니다.']},
  {evidenceId:'example-1',reason:'촬영 방식에서 이야기와 인물로 화제를 넓히는 자료입니다.',keyPoints:['제작진은 새로운 인물로 이야기를 전하고 싶다고 설명했습니다.','인물의 세부 설정과 줄거리는 공개하지 않았습니다.']},
  {evidenceId:'example-2',reason:'확인된 보도와 아직 기다려야 할 정보를 구분하며 마무리합니다.',keyPoints:['후속 공개 일정은 검토 중이라는 매체 보도입니다.','확정 일정이나 흥행 수치는 선택한 자료에 제시되지 않았습니다.']},
 ],sections:[
  {heading:'도입 · 촬영 현장에서 시작하기',purpose:'추상적인 기대감보다 보도에 담긴 구체적인 제작 접근법을 먼저 보여줍니다.',points:['제작진이 설명한 모형 활용 촬영 접근법을 매체 보도라는 맥락과 함께 소개합니다.','장면의 질감과 협업이라는 핵심 화제를 정리합니다.'],evidenceIds:['example-0'],transition:'어떻게 촬영하는지에서 어떤 인물을 통해 이야기하는지로 질문을 옮깁니다.'},
  {heading:'본론 · 새로운 인물과 이야기의 방향',purpose:'인터뷰에서 드러난 의도와 아직 공개되지 않은 내용을 분리합니다.',points:['새로운 인물을 통해 이야기를 전하고 싶다는 제작진의 설명을 소개합니다.','세부 인물 설정과 줄거리는 공개하지 않았다는 범위를 분명히 합니다.'],evidenceIds:['example-1'],transition:'이야기에 대한 관심을 유지하면서 앞으로 확인할 공개 소식으로 연결합니다.'},
  {heading:'마무리 · 보도와 기다려야 할 정보',purpose:'일정과 흥행 전망을 확정 사실처럼 다루지 않고 남은 질문을 정리합니다.',points:['매체가 전한 후속 공개 일정은 검토 중이라는 점을 안내합니다.','자료에 확정 일정과 흥행 수치가 없으므로 전망을 수치로 만들지 않습니다.'],evidenceIds:['example-2'],transition:'참고 기사 링크를 안내하고 후속 소식을 기다리는 열린 질문으로 마칩니다.'},
 ],limitations:['검토 중인 일정은 확정된 계획으로 바꾸지 않습니다.','이 결과는 구성안이며 내레이션 대본이 아닙니다.']};
