import {mvpOutput} from '../scripts/fixtures/assistant/mvp-output.mjs';
// Synthetic, browser-network-only responses. No production archive, wallet or provider.
const longTitle='아소카의 새로운 발표와 제작 논의에 관한 매우 긴 한국어 소식 제목 '.repeat(4);
export const article=(index)=>({
  evidenceId:'a'+index,articleId:'a'+index,storyId:'s'+index,
  title:index===0?'보도 <script>window.pwned=true</script> '+longTitle:longTitle,
  summary:'보도에 따르면 관련 제작이 논의 중입니다. 상세한 사실은 선택한 아카이브 요약으로만 확인합니다. '.repeat(5),
  source:{id:'starwars',label:'아주 긴 공식 출처 이름 StarWars.com '.repeat(3),sourceClass:'official',displayClass:'공식 채널',certainty:'unclear'},
  published:'2026-10-15',category:'영화',orderUncertain:index===0,
  truncated:{title:false,summary:false},
  url:index===1?'javascript:alert(1)':'https://example.com/archive/'+index,
});
export const candidates=Array.from({length:9},(_,index)=>({
  storyId:'s'+index,representative:article(index),evidence:[article(index)],
  sourceCount:1,omittedArticleCount:index===0?2:0,orderUncertain:index===0,
  relatedWorks:[{id:'work-a',title:'아소카'}],workIds:['work-a'],
  independentVerification:false,score:10-index,matchedTermCoverage:1,
}));
const archiveWindow={from:'2026-07-18T00:00:00.000Z',to:'2026-10-16T00:00:00.000Z'};
export const retrieval={
  status:'ready',reason:'matched',candidates,workChoices:[],resolvedWork:null,
  searchTerms:['제작'],proposedStoryIds:candidates.slice(0,6).map(c=>c.storyId),
  receipt:'synthetic-browser-only-receipt',archiveWindow,asOf:'2026-10-16T00:00:00.000Z',
};
export const generation=(mode='qa')=>({
  status:'ok',mode,
  result:{...mvpOutput(mode,[article(0)]),...(mode==='script'?{caveats:[]}: {})},
  evidence:[{...article(0),citation:1}],usedStories:[{storyId:'s0',omittedArticleCount:2,orderUncertain:true,independentVerification:false}],
  relatedStories:[],warnings:['아카이브 요약 한계'],archiveWindow,asOf:retrieval.asOf,
  credit:{charged:mode==='qa'?5:7,refund:null},
});
export const account={policy:{version:1,prices:{qa:5,planner:7},rewards:{guestFirst:1,opening:1,attendanceDaily:1,attendanceDay7:5,quizCorrect:3,accountFirst:3}},ownerType:'account',balance:100,cap:null,rewards:[],attendance:{streak:0,claimedToday:false,days:[]}};
export const guest={...account,ownerType:'guest',balance:3,cap:10};

export async function mockApis(page,{owner='account'}={}){
  const requests={retrieve:[],generate:[]};
  let retrievalReply=retrieval,generateReply=null,creditOwner=owner;
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort();
  });
  await page.route('**/api/credit/visit',route=>route.fulfill({json:creditOwner==='account'?account:guest}));
  await page.route('**/api/assistant/retrieve',route=>{
    requests.retrieve.push(JSON.parse(route.request().postData()??'{}'));
    return route.fulfill({json:retrievalReply});
  });
  await page.route('**/api/assistant/generate',async route=>{
    const body=JSON.parse(route.request().postData()??'{}');
    requests.generate.push(body);
    const reply=await generateReply?.(body)??{json:generation(body.mode,body.includeDraft)};
    try{await route.fulfill(reply);}catch(error){
      // Only the explicitly observed browser abort may discard a held response.
      if(route.request().failure()?.errorText!=='net::ERR_ABORTED')throw error;
    }
  });
  return {
    requests,
    setRetrieval(value){retrievalReply=value;},
    setGeneration(callback){generateReply=callback;},
    setOwner(value){creditOwner=value;},
  };
}
