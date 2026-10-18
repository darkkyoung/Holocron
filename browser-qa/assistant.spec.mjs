import {test,expect,openAssistant as open} from './browser-fixture.mjs';
import {generation,retrieval} from './fixtures.mjs';

const widths=[1440,1024,820,768,390,375,360];
const storyChecks=page=>page.locator('section[aria-labelledby="assistant-candidates-title"] input[type="checkbox"]');
const submit=page=>page.getByRole('button',{name:/CR로 생성하기/});

async function retrieve(page,query='제작 관련 소식'){
  await page.getByLabel('질문',{exact:true}).fill(query);
  await page.getByRole('button',{name:/무료로 소식 찾기|다시 검색하기/}).click();
  await expect(page.getByRole('heading',{name:'검색된 소식',exact:false})).toBeVisible();
}
async function script(page){
  await page.getByRole('button',{name:'영상 구성 가이드 만들기'}).click();
  await page.getByLabel('영상 주제',{exact:true}).fill('제작 논의');
  await page.getByRole('button',{name:/무료로 소식 찾기/}).click();
  await expect(storyChecks(page)).toHaveCount(9);
}

for(const width of widths)test(`rendered responsive workspace ${width}px`,async({page,browser,browserName},testInfo)=>{
  const height=width<=390?800:900;
  await page.setViewportSize({width,height});
  const api=await open(page);
  await retrieve(page);
  await expect(page.locator('section[aria-labelledby="assistant-candidates-title"] input[type="checkbox"]:checked')).toHaveCount(6);
  const story=page.locator('section[aria-labelledby="assistant-candidates-title"] article').first();
  await story.locator('summary').click();
  await expect(story.getByText('같은 소식의 기사 2개는')).toBeVisible();
  await expect(story.getByText('<script>window.pwned=true</script>',{exact:false}).first()).toBeVisible();
  expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
  expect(await story.locator('a[href^="javascript:"]').count()).toBe(0);
  const metrics=await page.evaluate(()=>{
    const form=document.querySelector('form[aria-label="아카이브 검색"]'),side=document.querySelector('aside[aria-label="근거 검토 및 생성"]');
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,
      form:form?.getBoundingClientRect().toJSON(),side:side?.getBoundingClientRect().toJSON(),
      title:document.querySelector('section[aria-labelledby="assistant-candidates-title"] strong')?.getBoundingClientRect().toJSON()};
  });
  expect(metrics.scroll,`document overflow at ${width}px`).toBeLessThanOrEqual(metrics.client+1);
  for(const key of ['form','side','title']){
    expect(metrics[key],`${key} exists`).toBeTruthy();
    expect(metrics[key].left).toBeGreaterThanOrEqual(-1);
    expect(metrics[key].right,`${key} clipped at ${width}px`).toBeLessThanOrEqual(width+1);
  }
  if(width<=820)expect(metrics.side.top).toBeGreaterThan(metrics.form.top);
  else expect(metrics.side.left).toBeGreaterThan(metrics.form.left);
  await expect(submit(page)).toBeVisible();
  await expect(storyChecks(page).last()).toBeVisible();
  await story.locator('summary').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath(`assistant-${width}.png`),fullPage:true});
  if(width===1440)console.log(`Actual browser: ${browserName} ${browser.version()}; localhost rendered and React search handled`);
  await testInfo.attach('viewport-metrics',{body:JSON.stringify({browserName,version:browser.version(),metrics,requests:api.requests.retrieve.length}),contentType:'application/json'});
});

test('Q&A uses reviewed evidence, one paid request, citations and attributed copy',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  const api=await open(page);
  await retrieve(page);
  expect(api.requests.retrieve).toHaveLength(1);
  expect(Object.keys(api.requests.retrieve[0]).sort()).toEqual(['filters','mode','query']);
  expect(await storyChecks(page).evaluateAll(items=>items.filter(item=>item.checked).length)).toBe(6);
  await storyChecks(page).nth(1).uncheck();
  expect(await storyChecks(page).evaluateAll(items=>items.filter(item=>item.checked).length)).toBe(5);
  await expect(page.getByText('선택한 근거 5개 소식')).toBeVisible();
  await expect(page.getByText('답변 5 CR',{exact:false})).toBeVisible();
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'생성 결과'})).toBeVisible();
  expect(api.requests.generate).toHaveLength(1);
  const request=api.requests.generate[0];
  expect(Object.keys(request).sort()).toEqual(['includeDraft','instructions','mode','receipt','requestId','selectedStoryIds']);
  expect(request.requestId).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
  expect(request.receipt).toBe(retrieval.receipt);
  expect(request.selectedStoryIds).toHaveLength(5);
  await expect(page.getByRole('link',{name:/근거 1:/})).toHaveAttribute('href','#assistant-citation-1');
  await expect(page.locator('#assistant-citation-1')).toBeVisible();
  await expect(page.getByText('출처가 있는 보도')).toBeVisible();
  await expect(page.getByText('선택한 공개 요약만 확인했습니다.')).toBeVisible();
  await page.getByRole('button',{name:'답변과 출처 복사'}).click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  expect(copied).toContain('https://example.com/archive/0');
  expect(copied).toContain('최근 90일');
  expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
  await expect(page.locator('#assistant-citation-1 a')).toHaveAttribute('rel','noopener noreferrer');
  await expect(page.locator('#assistant-citation-1 a')).toHaveAttribute('target','_blank');
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
  expect(new URL(page.url()).search).toBe('');
});

test('script starts empty, caps selection, and generates only a 7 CR guide',async({page})=>{
  const api=await open(page);
  await script(page);
  expect(await storyChecks(page).evaluateAll(items=>items.filter(item=>item.checked).length)).toBe(0);
  await expect(submit(page)).toBeDisabled();
  for(let index=0;index<8;index++)await storyChecks(page).nth(index).check();
  await expect(storyChecks(page).nth(8)).toBeDisabled();
  await expect(page.getByText('영상 구성 가이드 7 CR',{exact:false})).toBeVisible();
  await page.getByLabel('구성 방향 요청 (선택)').fill('차분한 해설');
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'영상 구간별 구성 방향'})).toBeVisible();
  expect(api.requests.generate).toHaveLength(1);
  expect(api.requests.generate[0].includeDraft).toBe(false);
  expect(api.requests.generate[0].selectedStoryIds).toHaveLength(8);
  await expect(page.getByLabel(/대본 초안 포함/)).toHaveCount(0);
  await expect(page.getByText('15 CR',{exact:false})).toHaveCount(0);
  await page.getByLabel('구성 방향 요청 (선택)').fill('짧게');
  await expect(page.getByText('이전 요청의 결과입니다.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'구성안과 출처 복사'})).toHaveCount(0);
  expect(api.requests.generate).toHaveLength(1);
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'생성 결과'})).toBeVisible();
  expect(api.requests.generate).toHaveLength(2);
  expect(api.requests.generate[1].requestId).not.toBe(api.requests.generate[0].requestId);
  await expect(page.getByText('이전 요청의 결과입니다.',{exact:false})).toHaveCount(0);
});

for(const width of [375,390,1440])test(`video guide result and attributed copy ${width}px`,async({page,context},testInfo)=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.setViewportSize({width,height:width<500?824:900});
  const api=await open(page);await script(page);await storyChecks(page).first().check();
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'영상 구성 가이드',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'영상 구간별 구성 방향'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'근거가 있는 핵심 사실'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'대본 초안'})).toHaveCount(0);
  expect(api.requests.generate).toHaveLength(1);expect(api.requests.generate[0].includeDraft).toBe(false);
  await page.getByRole('button',{name:'구성안과 출처 복사'}).click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  expect(copied).toContain('https://example.com/archive/0');expect(copied).toContain('최근 90일');expect(copied).toContain('출처가 있는 보도');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`video-guide-${width}.png`),fullPage:true});
});

test('search conditions mark prior Q&A result and require explicit retrieval',async({page})=>{
  const api=await open(page);
  await retrieve(page);
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'생성 결과'})).toBeVisible();
  await page.getByLabel('질문',{exact:true}).fill('새 질문');
  await expect(page.getByText('이전 요청의 결과입니다.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'답변과 출처 복사'})).toHaveCount(0);
  await expect(submit(page)).toBeDisabled();
  expect(api.requests.generate).toHaveLength(1);
  await page.getByRole('button',{name:'다시 검색하기'}).click();
  await expect(page.getByRole('heading',{name:'검색된 소식',exact:false})).toBeVisible();
  await submit(page).click();
  await expect(page.getByRole('heading',{name:'생성 결과'})).toBeVisible();
  expect(api.requests.generate[1].requestId).not.toBe(api.requests.generate[0].requestId);
  await page.getByLabel('게시 시작일').fill('2026-10-01');
  await expect(page.getByText('이전 요청의 결과입니다.',{exact:false})).toBeVisible();
  await expect(submit(page)).toBeDisabled();
  expect(api.requests.generate).toHaveLength(2);
});

test('guest and insufficient/ambiguous evidence never start generation',async({page})=>{
  const api=await open(page,{owner:'guest'});
  await retrieve(page);
  await expect(submit(page)).toBeDisabled();
  await expect(page.getByText('AI 생성은 Account 로그인 후')).toBeVisible();
  await expect(page.getByText('Google 로그인').last()).toBeVisible();
  api.setRetrieval({...retrieval,status:'insufficient_evidence',candidates:[],proposedStoryIds:[],receipt:null});
  await page.getByRole('button',{name:'다시 검색하기'}).click();
  await expect(page.getByText('일치하는 공개 소식이 없습니다.')).toBeVisible();
  api.setRetrieval({...retrieval,status:'clarification',candidates:[],proposedStoryIds:[],receipt:null,workChoices:[{id:'work-a',title:'아소카'}]});
  await page.getByRole('button',{name:'다시 검색하기'}).click();
  await expect(page.getByText('작품 또는 시즌을 정확히 선택하거나 검색어를 구체화해 주세요.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'아소카 선택',exact:true})).toBeVisible();
  await expect(storyChecks(page)).toHaveCount(0);
  await expect(submit(page)).toHaveCount(0);
  expect(api.requests.generate).toHaveLength(0);
});

test('errors, capacity-first refunds, stale evidence and cancellation are visible without retries',async({page})=>{
  const api=await open(page);
  await retrieve(page);
  const failures=[
    ['PROVIDER_TIMEOUT',504,{settlement:'failed',refund:{requested:5,applied:5,forfeited:0,full:true}},'실제 적용 5 CR'],
    ['PROVIDER_UNAVAILABLE',503,{settlement:'failed',refund:{requested:5,applied:4,forfeited:1,full:false}},'1 CR 영구 포기'],
    ['INVALID_OUTPUT',502,{settlement:'failed',refund:{requested:5,applied:0,forfeited:5,full:false}},'실제 적용 0 CR'],
    ['ADMISSION_LIMIT',429,{settlement:'unknown',refund:null},'차감·환불 상태를 확인할 수 없습니다'],
    ['REQUEST_IN_PROGRESS',409,{settlement:'unknown',refund:null},'자동으로 다시 보내지 않습니다'],
    ['RESULT_NOT_RETAINED',409,{settlement:'completed',refund:null},'결과는 저장되지 않아'],
    ['INSUFFICIENT_BALANCE',409,{settlement:'unknown',refund:null},'현재 Account Credit으로는'],
    ['LOGIN_REQUIRED',401,{settlement:'unknown',refund:null},'Google 로그인'],
    ['REFUND_PENDING',503,{settlement:'refund_pending',refund:null},'환불 정산 대기 중'],
  ];
  for(const [index,[code,status,credit,visible]] of failures.entries()){
    api.setGeneration(()=>({status,json:{error:{code,message:'합성 오류 '+code},credit}}));
    await submit(page).click();
    await expect(page.getByRole('alert')).toContainText(visible);
    await expect(page.getByRole('heading',{name:'요청 결과를 확인해 주세요'})).toBeFocused();
    expect(api.requests.generate).toHaveLength(index+1);
  }
  api.setGeneration(()=>({status:409,json:{error:{code:'EVIDENCE_CHANGED',message:'근거가 변경됐습니다.'},credit:{settlement:'failed',refund:{requested:5,applied:5,forfeited:0,full:true}}}}));
  await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('새 검색과 근거 검토가 필요합니다');
  await expect(submit(page)).toBeDisabled();
  await page.getByRole('button',{name:'다시 검색하기'}).click();
  await expect(submit(page)).toBeEnabled();
  // Hold the response until cancellation is observed; CI speed cannot make it
  // finish before the busy-state assertion, unlike a fixed five-second delay.
  const pending=Promise.withResolvers();
  api.setGeneration(()=>pending.promise);
  try{
    await submit(page).click();
    await expect(page.getByRole('button',{name:'검증·생성 중…',exact:true})).toBeDisabled();
    await expect.poll(()=>api.requests.generate.length).toBe(failures.length+2);
    await expect(storyChecks(page).first()).toBeDisabled();
    const aborted=page.waitForEvent('requestfailed',request=>new URL(request.url()).pathname==='/api/assistant/generate');
    await page.getByRole('button',{name:'요청 취소',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('실제 차감 또는 환불 여부를 확인할 수 없습니다');
    pending.resolve({json:generation()});
    expect((await aborted).failure()?.errorText).toBe('net::ERR_ABORTED');
    await expect(page.getByRole('heading',{name:'생성 결과'})).toHaveCount(0);
    await expect(submit(page)).toBeEnabled();
    expect(api.requests.generate).toHaveLength(failures.length+2);
  }finally{pending.resolve({json:generation()});}
});

test('keyboard focus, native selection, Escape and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);
  await page.getByLabel('질문',{exact:true}).focus();
  await page.keyboard.type('제작');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe('SELECT');
  await page.getByRole('button',{name:'무료로 소식 찾기'}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'검색 결과'})).toBeFocused();
  await storyChecks(page).first().focus();
  await page.keyboard.press('Space');
  await expect(storyChecks(page).first()).not.toBeChecked();
  const details=page.locator('section[aria-labelledby="assistant-candidates-title"] details').first();
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open','');
  await page.keyboard.press('Escape');
  await expect(details).not.toHaveAttribute('open','');
  await expect(details.locator('summary')).toBeFocused();
  await expect(page.getByRole('status').last()).toContainText('소식을 찾았습니다');
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});

test('genuine tab hide/show marks evidence stale; fresh retrieval clears it',async({page,context})=>{
  await open(page);
  await retrieve(page);
  const other=await context.newPage();
  await other.goto('about:blank');
  await other.bringToFront();
  const hidden=await page.evaluate(()=>document.visibilityState);
  test.skip(hidden!=='hidden',`Chromium did not report genuine hidden state (${hidden})`);
  await page.bringToFront();
  await expect(page.getByText('근거가 오래됐거나 검색 조건이 달라졌습니다.')).toBeVisible();
  await page.getByRole('button',{name:'다시 검색하기'}).click();
  await expect(page.getByText('근거가 오래됐거나 검색 조건이 달라졌습니다.')).toHaveCount(0);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('근거가 오래됐거나 검색 조건이 달라졌습니다.')).toHaveCount(0);
  await other.bringToFront();
  expect(await page.evaluate(()=>document.visibilityState)).toBe('hidden');
  await page.bringToFront();
  await expect(page.getByText('근거가 오래됐거나 검색 조건이 달라졌습니다.')).toBeVisible();
  await other.close();
});
