import {test,expect} from '@playwright/test';

test('disabled direct route and News launcher remain COMING SOON',async({page})=>{
  let apiCalls=0;
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort();
  });
  await page.route('**/api/assistant/**',route=>{apiCalls++;return route.abort();});
  await page.route('**/api/credit/visit',route=>route.fulfill({json:{ownerType:'guest',balance:0,cap:10,rewards:[],attendance:{streak:0,claimedToday:false,days:[]}}}));
  await page.goto('/assistant');
  await expect(page.getByText('COMING SOON')).toBeVisible();
  await expect(page.getByRole('button',{name:/CR로 생성하기/})).toHaveCount(0);
  await expect(page.getByLabel('질문',{exact:true})).toHaveCount(0);
  await page.goto('/');
  await page.getByRole('button',{name:'AI 도우미 열기'}).click();
  await expect(page.getByRole('dialog')).toContainText('COMING SOON');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(apiCalls).toBe(0);
});
