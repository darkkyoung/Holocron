// Synthetic contract fixture. No Provider or network access.
export function mvpOutput(mode,articles){
 const a=articles[0],text=a.summary;
 if(mode==='qa')return {status:'ok',answer:text,evidenceIds:[a.evidenceId],limitations:['선택된 아카이브 요약을 참고했습니다.']};
 return {status:'ok',titles:['보도로 살펴보는 제작 이야기','아카이브에서 찾은 제작 소식'],direction:'보도 내용과 확인되지 않은 부분을 구분해 전달합니다.',
  recommendations:[{evidenceId:a.evidenceId,reason:'영상 주제에 관한 보도를 소개하는 자료입니다.',keyPoints:[text,'선택한 보도의 내용을 출처와 함께 소개합니다.']}],
  sections:[{heading:'도입 · 핵심 소식',purpose:'주제와 보도 범위를 소개합니다.',points:[text,'보도에서 확인할 수 있는 내용부터 소개합니다.'],evidenceIds:[a.evidenceId],transition:'보도 내용과 확인이 필요한 부분을 나누어 살펴봅니다.'},{heading:'마무리 · 확인할 점',purpose:'확인된 보도와 남은 질문을 정리합니다.',points:[text,'제공된 자료 범위를 넘어 내용을 단정하지 않습니다.'],evidenceIds:[a.evidenceId],transition:'출처를 안내하고 확인되지 않은 부분을 남깁니다.'}],limitations:['선택한 제목·요약만 참고한 구성 제안입니다.']};
}
export function insufficientOutput(mode){return mode==='qa'?{status:'insufficient_evidence',answer:'선택한 자료만으로 질문에 답하기 어렵습니다.',evidenceIds:[],limitations:['질문과 직접 관련된 기사가 필요합니다.']}:{status:'insufficient_evidence',titles:[],direction:'선택한 자료로 구성안을 만들기 어렵습니다.',recommendations:[],sections:[],limitations:['관련 기사가 필요합니다.']};}
