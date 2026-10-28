import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
// Build first with browser-qa/build-mvp-preview.mjs. All browser requests are local fixtures.
const root=resolve(process.argv[2]??'/tmp/phase-a-preview'),shots=resolve('outputs/phase-a-pricing');await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true});let blocked=0;
try{
 for(const [width,height] of [[1440,900],[360,800]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='http://127.0.0.1:4321'||!['/surface.html','/surface.js','/surface.css'].includes(url.pathname)){blocked++;return route.abort();}await route.fulfill({body:await readFile(resolve(root,'dist'+url.pathname)),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(url.pathname)]});});
  await page.goto('http://127.0.0.1:4321/surface.html?balance=0');await page.getByRole('button',{name:'AI 도우미 열기'}).click();
  await page.locator('#assistant-query').fill('안녕');assert.match(await page.locator('#assistant-cost').textContent(),/무료/);
  await page.locator('#assistant-query').press('Enter');await page.getByText('안녕하세요! 스타워즈 이야기를 함께 나눠요.',{exact:false}).waitFor();
  assert.match(await page.locator('#counts').textContent(),/검색 0 \/ 생성 1/);assert.match(await page.getByText('Account 0 CR',{exact:true}).textContent(),/0 CR/);
  await page.getByRole('button',{name:'재생성 비용 확인'}).click();await page.getByRole('button',{name:'무료로 다시 생성',exact:true}).waitFor();assert.equal(await page.getByText('추가 5 CR',{exact:false}).count(),0);
  await page.getByRole('button',{name:'취소',exact:true}).click();assert.match(await page.locator('#counts').textContent(),/생성 1/);
  await page.screenshot({path:resolve(shots,`free-chat-${width}.png`)});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'AI 도우미 열기'}).click();assert.match(await page.locator('#counts').textContent(),/생성 1/);
  await page.getByRole('button',{name:'상세 설정',exact:true}).click();await page.getByLabel('HOLOCRON 최신 뉴스 검색').check();await page.locator('#assistant-query').fill('스타파이터');
  assert.match(await page.locator('#assistant-cost').textContent(),/Q&A 1 CR/);assert.equal(await page.getByRole('button',{name:/질문 전송/}).isDisabled(),true);
  await page.getByRole('button',{name:'근거를 먼저 선택 · 무료 검색'}).click();await page.getByText(/개 소식을 찾았습니다/).waitFor();assert.match(await page.locator('#counts').textContent(),/검색 1 \/ 생성 1/);
  await page.screenshot({path:resolve(shots,`free-search-${width}.png`)});
  await page.getByRole('button',{name:'영상 구성안 플래너',exact:true}).click();assert.match(await page.locator('#assistant-cost').textContent(),/플래너 7 CR/);
  const bounds=await page.locator('[role="dialog"]').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.close();
 }
 assert.equal(blocked,0);console.log('PASS Chromium 1440/360: actual overlay, zero-credit free chat, regenerate consent/cancel, close/reopen, free search at zero balance, paid generation disabled, 1/7 CR prices, no external requests; HTTP/D1 settlement separately covered by account integration');
}finally{await browser.close();}
