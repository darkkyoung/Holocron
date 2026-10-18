// Synthetic local credentials only. No Production host, key or provider transport.
import {test,expect,openAssistant} from './browser-fixture.mjs';
import {account,generation} from './fixtures.mjs';
const endpoint='/api/admin/credit-policy';
const origin='http://127.0.0.1:5173';
async function login(context){
  const response=await context.request.post('/api/admin/login',{headers:{Origin:origin},form:{username:'synthetic-policy-admin',password:'synthetic-local-policy-password-only'},maxRedirects:0});
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe(origin+'/admin');
  expect((await context.request.get(endpoint)).status()).toBe(200);
}
async function dashboard(context){const response=await context.request.get(endpoint);expect(response.status()).toBe(200);return response.json();}
async function openEditor(page){
  expect((await page.goto('/admin/credit-policy')).status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Credit 정책 및 AI 예산',exact:true})).toBeVisible();
  // Safe read-only interaction proves hydration; no repeated save for readiness.
  await expect(async()=>{await page.getByRole('button',{name:'최신 값 확인'}).click();await expect(page.getByRole('status')).toContainText('다시 확인했습니다',{timeout:1000});}).toPass({timeout:15000});
}
async function preview(page,value){
  await page.locator('#qaCredits').fill(String(value));
  await page.locator('#qaCredits').locator('..').getByRole('button',{name:'변경 확인'}).click();
  await expect(page.getByRole('region',{name:'저장 전 변경 확인'})).toBeVisible();
}
for(const width of [375,390,1440])test(`real Admin D1 preview cancel save ${width}`,async({page,context,browser},info)=>{
  await login(context);await page.setViewportSize({width,height:824});await openEditor(page);
  const before=await dashboard(context),next=before.policy.values.qaCredits===5?6:5;
  await preview(page,next);
  await expect(page.getByRole('region',{name:'저장 전 변경 확인'})).toContainText(`${before.policy.values.qaCredits} → ${next}`);
  await page.screenshot({path:info.outputPath(`preview-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'취소',exact:true}).click();
  expect((await dashboard(context)).policy.version).toBe(before.policy.version);
  await preview(page,next);
  await page.getByRole('button',{name:'변경 저장',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('저장 완료');
  const after=await dashboard(context);expect(after.policy.version).toBe(before.policy.version+1);expect(after.policy.values.qaCredits).toBe(next);
  await expect(page.getByRole('heading',{name:`현재 정책 · revision ${after.policy.version}`})).toBeVisible();
  await expect(page.getByText('월 경고 기준 도달',{exact:true})).toBeVisible();
  await expect(page.getByText(/상한.*30/).first()).toBeVisible();
  const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('main input,main button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};})}));
  expect(metrics.scroll).toBeLessThanOrEqual(width+1);
  for(const r of metrics.controls){expect(r.left).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(width+1);expect(r.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:info.outputPath(`credit-policy-${width}.png`),fullPage:true});
  await info.attach('rendered-metrics',{body:JSON.stringify({browser:browser.version(),...metrics}),contentType:'application/json'});
});
test('real authentication, CSRF, validation and stale revision rejection',async({page,context})=>{
  expect((await context.request.get(endpoint)).status()).toBe(401);
  expect((await context.request.post(endpoint,{headers:{Origin:origin},data:{}})).status()).toBe(401);
  await page.goto('/admin/credit-policy');await expect(page).toHaveURL(/\/admin\/login$/);
  await login(context);await openEditor(page);const before=await dashboard(context);
  const body={expectedVersion:before.policy.version,values:{...before.policy.values,qaCredits:8}};
  expect((await context.request.post(endpoint,{headers:{Origin:'https://invalid.example'},data:body})).status()).toBe(403);
  expect((await context.request.post(endpoint,{headers:{Origin:origin},data:{...body,values:{...body.values,monthlyWarningUsd:31}}})).status()).toBe(400);
  expect((await dashboard(context)).policy.version).toBe(before.policy.version);
  await preview(page,9);
  expect((await context.request.post(endpoint,{headers:{Origin:origin},data:body})).status()).toBe(200);
  await page.getByRole('button',{name:'변경 저장',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('다른 관리자 작업');
  expect((await dashboard(context)).policy.values.qaCredits).toBe(8);
  await page.getByRole('button',{name:'최신 값 확인'}).click();await expect(page.locator('#qaCredits')).toHaveValue('8');
});
test('stale quote refresh requires a second deliberate action (mock transport)',async({page})=>{
  const api=await openAssistant(page);let credit={...account};
  await page.route('**/api/credit/visit',route=>route.fulfill({json:credit}));
  await page.getByLabel('질문',{exact:true}).fill('합성 제작 소식');
  await page.getByRole('button',{name:'무료로 소식 찾기',exact:true}).click();
  await expect(page.getByRole('button',{name:'5 CR로 생성하기',exact:true})).toBeEnabled();
  api.setGeneration(()=>{credit={...account,policy:{...account.policy,version:2,prices:{qa:9,planner:11}}};return {status:409,json:{error:{code:'PRICE_CHANGED',message:'가격을 다시 확인해 주세요.'}}};});
  await page.getByRole('button',{name:'5 CR로 생성하기',exact:true}).click();
  await expect(page.getByText('새 요청은 접수되지 않았으며 Credit은 차감되지 않았습니다.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'9 CR로 생성하기',exact:true})).toBeEnabled();
  expect(api.requests.generate).toHaveLength(1);expect(api.requests.generate[0].policyVersion).toBe(1);
  api.setGeneration(()=>({json:{...generation('qa',false),credit:{charged:9,refund:null}}}));
  await page.getByRole('button',{name:'9 CR로 생성하기',exact:true}).click();
  await expect(page.getByRole('heading',{name:'생성 결과'})).toBeVisible();
  expect(api.requests.generate).toHaveLength(2);expect(api.requests.generate[1].policyVersion).toBe(2);
  expect(api.requests.generate[1].requestId).not.toBe(api.requests.generate[0].requestId);
});

test('monthly warning and lower limit display from actual saved D1 policy',async({page,context})=>{
  await login(context);await openEditor(page);
  await expect(page.getByText('월 경고 기준 도달',{exact:true})).toBeVisible();
  const before=await dashboard(context);expect(before.usedMicros).toBe(21000000);
  const response=await context.request.post(endpoint,{headers:{Origin:origin},data:{expectedVersion:before.policy.version,values:{...before.policy.values,monthlyLimitUsd:20}}});
  expect(response.status()).toBe(200);
  await page.getByRole('button',{name:'최신 값 확인'}).click();
  await expect(page.getByText('월 한도 도달: 새 생성 차단',{exact:true})).toBeVisible();
  const after=await dashboard(context);expect(after.usedMicros).toBe(before.usedMicros);expect(after.remainingMicros).toBe(0);expect(after.blocked).toBe(true);
  expect((await context.request.post(endpoint,{headers:{Origin:origin},data:{expectedVersion:after.policy.version,values:before.policy.values}})).status()).toBe(200);
});
test('Full Draft direct local API request rejected before generation',async({context})=>{
  const response=await context.request.post('/api/assistant/generate',{headers:{Origin:origin},data:{requestId:crypto.randomUUID(),mode:'script',receipt:'synthetic-invalid-receipt',selectedStoryIds:['s0'],instructions:'',includeDraft:true,policyVersion:1}});
  expect(response.status()).toBe(400);expect((await response.json()).error.code).toBe('INVALID_REQUEST');
});
