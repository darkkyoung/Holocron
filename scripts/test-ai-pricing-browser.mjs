import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
// Build first with browser-qa/build-mvp-preview.mjs. All browser requests are local fixtures.
const root=resolve(process.argv[2]??'/tmp/phase-a1-preview'),shots=resolve('outputs/phase-a1-pricing');await mkdir(shots,{recursive:true});
const browser=await chromium.launch({headless:true});let blocked=0;
try{
 for(const [width,height] of [[1440,900],[360,800]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='http://127.0.0.1:4321'||!['/surface.html','/surface.js','/surface.css'].includes(url.pathname)){blocked++;return route.abort();}await route.fulfill({body:await readFile(resolve(root,'dist'+url.pathname)),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(url.pathname)]});});
  await page.goto('http://127.0.0.1:4321/surface.html?balance=0');await page.getByRole('button',{name:'AI 도우미 열기'}).click();
  await page.locator('#assistant-query').fill('안녕');assert.match(await page.locator('#assistant-cost').textContent(),/1 CR/);
  assert.equal(await page.getByRole('button',{name:/질문 전송/}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'영상 구성안 플래너',exact:true}).count(),0);
  await page.getByRole('button',{name:'뉴스 Q&A',exact:true}).click();await page.locator('#assistant-query').fill('스타파이터');
  await page.getByRole('button',{name:'상세 설정',exact:true}).click();await page.getByRole('button',{name:'근거를 먼저 선택 · 무료 검색'}).click();
  await page.getByText(/개 소식을 찾았습니다/).waitFor();assert.match(await page.locator('#counts').textContent(),/검색 1 \/ 생성 0/);
  await page.screenshot({path:resolve(shots,`free-search-${width}.png`)});
  await page.goto('http://127.0.0.1:4321/surface.html?balance=2');await page.getByRole('button',{name:'AI 도우미 열기'}).click();
  await page.locator('#assistant-query').fill('안녕');await page.locator('#assistant-query').press('Enter');
  await page.getByText('안녕하세요! 스타워즈 이야기를 함께 나눠요.',{exact:false}).waitFor();
  assert.match(await page.locator('#counts').textContent(),/검색 0 \/ 생성 1/);await page.getByText('Account 1 CR',{exact:true}).waitFor();
  await page.getByRole('button',{name:'재생성 비용 확인'}).click();await page.getByRole('button',{name:'추가 1 CR 사용에 동의하고 생성',exact:true}).waitFor();
  await page.getByRole('button',{name:'취소',exact:true}).click();assert.match(await page.locator('#counts').textContent(),/생성 1/);
  await page.screenshot({path:resolve(shots,`paid-chat-${width}.png`)});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'AI 도우미 열기'}).click();assert.match(await page.locator('#counts').textContent(),/생성 1/);
  const bounds=await page.locator('[role="dialog"]').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.close();
 }
 assert.equal(blocked,0);console.log('PASS Chromium 1440/360: actual overlay, 1 CR paid chat, paid regeneration consent/cancel, close/reopen, free search at zero balance, zero-balance generation disabled, Planner hidden, no external requests; HTTP/D1 settlement separately covered by account integration');
}finally{await browser.close();}
