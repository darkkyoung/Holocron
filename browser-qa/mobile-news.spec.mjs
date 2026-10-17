import {test,expect} from '@playwright/test';
import {account,guest} from './fixtures.mjs';

const widths=[390,375,360,550,551,1024,1440];
async function openNews(page,{owner='account',balance=1250}={}){
  const visits=[];
  await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await page.route('**/api/credit/visit',route=>{visits.push(route.request().method());return route.fulfill({json:owner==='account'?{...account,balance}:{...guest,balance:4}});});
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  const response=await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.news-grid > article').first()).toBeVisible();
  await expect(page.locator('.credit-balance > summary')).toContainText(owner==='account'?`${balance.toLocaleString('ko-KR')} CR`:'4 CR');
  return visits;
}

for(const width of widths)test(`News-first rendered layout ${width}px`,async({page,browser},testInfo)=>{
  await page.setViewportSize({width,height:824});
  const visits=await openNews(page);
  const metrics=await page.evaluate(()=>{
    const bounds=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,card:bounds('.news-grid > article'),title:bounds('.news-grid > article h3'),brand:bounds('.brand'),credit:bounds('.credit-balance > summary'),login:bounds('.credit-login > summary'),search:bounds('.mobile-news-search-button'),nav:bounds('.masthead nav'),feedback:bounds('.news-feedback-rail'),intro:bounds('.intro')};
  });
  expect(metrics.scroll).toBeLessThanOrEqual(width+1);
  for(const name of ['card','title','brand','credit','login','nav']){
    expect(metrics[name],`${name} exists`).toBeTruthy();
    expect(metrics[name].left,`${name} left clipped`).toBeGreaterThanOrEqual(-1);
    expect(metrics[name].right,`${name} right clipped`).toBeLessThanOrEqual(width+1);
  }
  if(width<=550){
    expect(metrics.title.top,`first headline below first screen ${width}`).toBeLessThan(824);
    expect(metrics.card.top).toBeGreaterThan(metrics.nav.bottom-1);
    expect(metrics.credit.right).toBeLessThan(metrics.search.left+1);
    expect(metrics.credit.right).toBeLessThanOrEqual(metrics.login.left+1);
    expect(metrics.login.right).toBeLessThan(metrics.search.left+1);
    expect(metrics.brand.right).toBeLessThanOrEqual(metrics.credit.left+1);
    expect(metrics.intro.width).toBeLessThanOrEqual(1);
    expect(metrics.feedback.top).toBeGreaterThan(metrics.card.top);
    await expect(page.getByRole('button',{name:'뉴스 검색 열기'})).toBeVisible();
  }else{
    await expect(page.getByRole('button',{name:'뉴스 검색 열기'})).toBeHidden();
    await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeVisible();
    expect(metrics.intro.width).toBeGreaterThan(200);
    expect(metrics.feedback.top).toBeLessThan(metrics.card.bottom);
  }
  expect(visits).toHaveLength(1);
  await page.screenshot({path:testInfo.outputPath(`news-${width}.png`),fullPage:false});
  console.log(`News viewport ${width}: Chromium ${browser.version()}, cardTop=${Math.round(metrics.card.top)}, titleTop=${Math.round(metrics.title.top)}, scroll=${metrics.scroll}`);
  await testInfo.attach('layout-metrics',{body:JSON.stringify(metrics),contentType:'application/json'});
});

test('mobile search keeps one filter state, work link, pagination and Credit initialization',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:824});
  const visits=await openNews(page);
  const trigger=page.getByRole('button',{name:'뉴스 검색 열기'});
  await trigger.click();
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeFocused();
  await page.screenshot({path:testInfo.outputPath('mobile-search-open.png')});
  await page.getByRole('searchbox',{name:'뉴스 검색'}).fill('아소카');
  await expect(page.locator('.news-grid > article')).toHaveCount(1);
  await page.getByRole('button',{name:'결과 보기'}).click();
  await expect(page.getByText('검색 조건 적용 중',{exact:false})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeHidden();
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toHaveValue('아소카');
  await page.getByRole('button',{name:'결과 보기'}).click();
  await page.getByRole('button',{name:'초기화'}).click();
  await expect(page.locator('.news-grid > article')).toHaveCount(5);
  await page.getByRole('button',{name:'다음'}).click();
  await expect(page.locator('.news-grid > article')).toHaveCount(5);
  await page.getByRole('button',{name:'다음'}).click();
  await expect(page.locator('.news-grid > article')).toHaveCount(2);
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await page.getByRole('group',{name:'뉴스 카테고리'}).getByRole('button',{name:'영화'}).click();
  await expect(page.getByText('6개의 이야기',{exact:true})).toBeVisible();
  await page.getByLabel('관련 작품').selectOption('qa-work');
  await expect(page.locator('.news-grid > article')).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('work')).toBe('qa-work');
  await page.setViewportSize({width:1024,height:824});
  await expect(page.getByLabel('관련 작품')).toHaveValue('qa-work');
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeVisible();
  await page.setViewportSize({width:390,height:824});
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeHidden();
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await expect(page.getByLabel('관련 작품')).toHaveValue('qa-work');
  await page.getByRole('button',{name:'결과 보기'}).click();
  await page.locator('.credit-balance > summary').click();
  await expect(page.locator('.guest-credit-panel').getByText('Google 계정 로그인됨',{exact:false})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('mobile-credit-open.png')});
  await page.locator('.credit-balance > summary').click();
  await page.locator('.credit-balance > summary').click();
  expect(visits).toHaveLength(1);
});

test('Credit guide and separate login panel share one owner and require explicit OAuth/logout',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:824});
  let owner='guest',starts=0,logouts=0;
  const visits=[];
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  await page.route('**/api/credit/visit',route=>{visits.push(route.request().method());return route.fulfill({json:owner==='guest'?{...guest,balance:4}:{...account,balance:17}});});
  await page.route('**/api/auth/google/start',route=>{starts++;return route.fulfill({status:302,headers:{location:'/synthetic-auth-started'}});});
  await page.route('**/api/auth/logout',route=>{logouts++;owner='guest';return route.fulfill({json:{ok:true}});});
  await page.goto('/?work=qa-work');
  await expect(page.getByRole('button',{name:'뉴스 검색 열기'})).toBeVisible();
  await expect(page.locator('.credit-login > summary')).toHaveText('로그인');
  await page.locator('.credit-balance > summary').click();
  await expect(page.getByRole('heading',{name:'크레딧 모으는 방법'})).toBeVisible();
  await expect(page.getByText('Guest는 최대 10 CR까지 보유합니다.',{exact:false})).toBeVisible();
  await expect(page.getByText('첫 제출이 정답이면 +3 CR',{exact:false})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('credit-guide-open.png')});
  await page.locator('.credit-login > summary').click();
  await expect(page.getByRole('heading',{name:'로그인'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'크레딧 모으는 방법'})).toBeHidden();
  await expect(page.getByText('이후 다른 Guest 잔액이 계속 합쳐지지는 않습니다.',{exact:false})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('login-panel-open.png')});
  expect(starts).toBe(0);expect(logouts).toBe(0);expect(visits).toHaveLength(1);
  await page.locator('.credit-login > summary').press('Escape');
  await expect(page.locator('.credit-login > summary')).toBeFocused();
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await page.getByRole('searchbox',{name:'뉴스 검색'}).fill('아소카');
  await page.locator('.credit-login > summary').click();
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toBeHidden();
  await page.getByRole('button',{name:'로그인 패널 닫기'}).click();
  await expect(page.locator('.credit-login > summary')).toBeFocused();
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await expect(page.getByRole('searchbox',{name:'뉴스 검색'})).toHaveValue('아소카');
  expect(visits).toHaveLength(1);expect(starts).toBe(0);
  await page.getByRole('button',{name:'결과 보기'}).click();
  await page.locator('.credit-login > summary').click();
  await page.locator('.credit-login-panel').getByRole('link',{name:'Google 로그인'}).click();
  expect(starts).toBe(1);
  owner='account';
  await page.goto('/');
  await expect(page.locator('.credit-login > summary')).toHaveText('계정');
  await page.locator('.credit-login > summary').click();
  await expect(page.locator('.credit-login-panel').getByText('Account Credit은 다른 기기에서도 이어집니다.',{exact:false})).toBeVisible();
  await page.locator('.credit-login-panel').getByRole('button',{name:'로그아웃'}).click();
  expect(logouts).toBe(1);
  await expect(page.locator('.credit-login > summary')).toHaveText('로그인');
});

test('mobile direct work link, Guest cap, error and other public headers',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  const visits=[];
  await page.route('**/api/credit/visit',route=>{visits.push(route.request().method());return route.fulfill({json:{...guest,balance:4}});});
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  await page.goto('/?work=qa-work');
  await expect(page.locator('.news-grid > article')).toHaveCount(1);
  await expect(page.getByText('4 CR',{exact:true})).toBeVisible();
  await page.locator('.credit-balance > summary').click();
  await expect(page.getByText('Guest 최대 10 CR',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Google 로그인'})).toBeVisible();
  expect(visits).toHaveLength(1);
  for(const path of ['/works','/quiz','/roadmap','/assistant']){
    await page.goto(path);
    await expect(page.locator('.credit-balance > summary')).toBeVisible();
    await expect(page.getByRole('button',{name:'뉴스 검색 열기'})).toHaveCount(0);
    const overlap=await page.evaluate(()=>{const badge=document.querySelector('.credit-balance > summary')?.getBoundingClientRect(),button=document.querySelector('.masthead .feedback-entry')?.getBoundingClientRect();return badge&&button?!(badge.right<=button.left||button.right<=badge.left||badge.bottom<=button.top||button.bottom<=badge.top):false;});
    expect(overlap,`badge overlaps header feedback on ${path}`).toBe(false);
  }
});

test('large Account balance, Credit error and zero-story state do not invent a balance',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  let response={...account,balance:Number.MAX_SAFE_INTEGER};
  await page.route('**/api/credit/visit',route=>route.fulfill({json:response}));
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  await page.goto('/');
  await expect(page.locator('.credit-mobile-label')).toContainText('9,007,199,254,740,991 CR');
  const safe=await page.evaluate(()=>({document:document.documentElement.scrollWidth,badge:document.querySelector('.credit-balance > summary')?.getBoundingClientRect().toJSON()}));
  expect(safe.document).toBeLessThanOrEqual(361);
  expect(safe.badge.left).toBeGreaterThanOrEqual(0);
  await page.route('**/api/credit/visit',route=>route.fulfill({status:503,json:{error:'잠시 후 다시 시도해 주세요.'}}));
  await page.locator('.credit-balance > summary').click();
  await page.getByRole('button',{name:'상태 다시 확인'}).click();
  await expect(page.locator('.credit-mobile-label')).toHaveText('확인 불가');
  await expect(page.locator('.credit-mobile-label')).not.toContainText('0 CR');
  await page.locator('.credit-balance > summary').click();
  await page.getByRole('button',{name:'뉴스 검색 열기'}).click();
  await page.getByRole('searchbox',{name:'뉴스 검색'}).fill('검색되지 않는 합성 단어');
  await expect(page.getByText('검색 조건에 맞는 이야기가 없습니다.')).toBeVisible();
});

test('Credit loading and keyboard disclosure remain usable without a second visit',async({page})=>{
  await page.setViewportSize({width:375,height:824});
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  let visits=0;
  await page.route('**/api/credit/visit',async route=>{visits++;await gate;await route.fulfill({json:{...guest,balance:3}});});
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  await page.goto('/');
  await expect(page.locator('.credit-mobile-label')).toHaveText('확인 중');
  release();
  await expect(page.locator('.credit-mobile-label')).toHaveText('3 CR');
  const summary=page.locator('.credit-balance > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Guest 최대 10 CR',{exact:false})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  expect(visits).toBe(1);
});

test('OAuth return error opens login help without starting another OAuth attempt',async({page})=>{
  await page.setViewportSize({width:360,height:824});
  let starts=0,visits=0;
  await page.route('**/api/credit/visit',route=>{visits++;return route.fulfill({json:guest});});
  await page.route('**/api/analytics/view',route=>route.fulfill({json:{ok:true}}));
  await page.route('**/api/auth/google/start',route=>{starts++;return route.abort();});
  await page.goto('/?login=failed');
  await expect(page.getByRole('heading',{name:'로그인'})).toBeVisible();
  await expect(page.locator('.credit-login-panel').getByRole('alert')).toContainText('Google 로그인을 완료하지 못했습니다.');
  expect(new URL(page.url()).searchParams.has('login')).toBe(false);
  expect(starts).toBe(0);expect(visits).toBe(1);
});
