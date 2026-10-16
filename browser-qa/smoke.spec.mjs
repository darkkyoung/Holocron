import {test,expect,openAssistant} from './browser-fixture.mjs';
import {candidates} from './fixtures.mjs';

test('hydrated React mode switching and one mocked retrieval without navigation',async({page,browser,diagnostics},testInfo)=>{
  const api=await openAssistant(page);
  const initialUrl=page.url();
  await page.getByLabel('질문',{exact:true}).fill('합성 아카이브 제작 소식');
  const [request]=await Promise.all([
    page.waitForRequest(request=>new URL(request.url()).pathname==='/api/assistant/retrieve'&&request.method()==='POST'),
    page.getByRole('button',{name:'무료로 소식 찾기',exact:true}).click(),
  ]);
  expect(request.postDataJSON()).toEqual({mode:'qa',query:'합성 아카이브 제작 소식',filters:{}});
  await expect(page.getByRole('heading',{name:'검색된 소식',exact:false})).toBeVisible();
  await expect(page.locator('section[aria-labelledby="assistant-candidates-title"] input[type="checkbox"]')).toHaveCount(candidates.length);
  expect(api.requests.retrieve).toHaveLength(1);
  expect(api.requests.generate).toHaveLength(0);
  expect(page.url()).toBe(initialUrl);
  expect(page.url().endsWith('?')).toBe(false);
  // Includes same-URL reloads: checking URL.search alone misses /assistant?.
  expect(diagnostics.events.filter(event=>event.kind==='document-request')).toHaveLength(1);
  expect(diagnostics.events.filter(event=>event.kind==='page-error'||event.kind==='script-failed'||event.kind==='script-http-error')).toEqual([]);
  const screenshot=testInfo.outputPath('hydrated-retrieval.png');
  await page.screenshot({path:screenshot,fullPage:true});
  await testInfo.attach('hydrated-retrieval',{path:screenshot,contentType:'image/png'});
  await testInfo.attach('smoke-evidence',{body:JSON.stringify({browser:browser.version(),modeSwitches:['script','qa'],retrievalPosts:api.requests.retrieve.length,generationRequests:api.requests.generate.length,documentRequests:1}),contentType:'application/json'});
  console.log(`Smoke PASS: Chromium ${browser.version()}, React mode changes and one mocked retrieval POST rendered candidates`);
});
