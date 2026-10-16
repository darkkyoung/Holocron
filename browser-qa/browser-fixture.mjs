import {createHash} from 'node:crypto';
import {test as base,expect} from '@playwright/test';
import {mockApis} from './fixtures.mjs';

function safeUrl(value){
  try{
    const url=new URL(value);
    return {origin:url.origin,path:url.pathname.slice(0,240),hasQuery:value.includes('?')};
  }catch{return {origin:'unknown',path:'unknown',hasQuery:false};}
}
function errorSummary(message){
  // No console arguments, request/response bodies, cookies or raw error text.
  const category=/hydration|hydrating/i.test(message)?'hydration'
    :/failed to fetch|network/i.test(message)?'network'
    :/module|import/i.test(message)?'module'
    :/TypeError|ReferenceError|SyntaxError/.exec(message)?.[0]??'other';
  return {category,digest:createHash('sha256').update(message).digest('hex').slice(0,16)};
}

export const test=base.extend({
  diagnostics:[async({page},provide,testInfo)=>{
    const events=[];
    let dropped=0;
    const started=Date.now();
    const record=(event)=>{if(events.length<120)events.push({ms:Date.now()-started,...event});else dropped++;};
    const handlers={
      pageerror:error=>record({kind:'page-error',...errorSummary(`${error.name}: ${error.message}`)}),
      console:message=>{
        if(message.type()==='error')record({kind:'console-error',...errorSummary(message.text()),...safeUrl(message.location().url),line:message.location().lineNumber});
      },
      framenavigated:frame=>{if(frame===page.mainFrame())record({kind:'navigation',...safeUrl(frame.url())});},
      request:request=>{
        const url=new URL(request.url());
        if(request.isNavigationRequest()&&request.frame()===page.mainFrame())record({kind:'document-request',method:request.method(),...safeUrl(request.url())});
        else if(url.pathname.startsWith('/api/assistant/'))record({kind:'assistant-request',method:request.method(),...safeUrl(request.url())});
      },
      requestfailed:request=>{
        if(request.resourceType()==='script')record({kind:'script-failed',...safeUrl(request.url()),reason:/net::[A-Z_]+/.exec(request.failure()?.errorText??'')?.[0]??'network-error'});
      },
      response:response=>{
        if(response.request().resourceType()==='script'&&response.status()>=400)record({kind:'script-http-error',status:response.status(),...safeUrl(response.url())});
      },
    };
    for(const [event,handler] of Object.entries(handlers))page.on(event,handler);
    try{await provide({events});}finally{
      for(const [event,handler] of Object.entries(handlers))page.off(event,handler);
      await testInfo.attach('safe-browser-diagnostics',{body:JSON.stringify({events,dropped}),contentType:'application/json'});
    }
  },{auto:true}],
});
export {expect};

export async function openAssistant(page,options){
  const api=await mockApis(page,options);
  const response=await page.goto('/assistant');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading',{name:'AI 도우미'})).toBeVisible();
  // SSR visibility is insufficient. Retry only free mode clicks until React's
  // handler changes the UI; never retry search or generation to establish readiness.
  await expect(async()=>{
    await page.getByRole('button',{name:'영상 대본 구성하기',exact:true}).click();
    await expect(page.getByLabel('영상 주제',{exact:true})).toBeVisible({timeout:1000});
  }).toPass({timeout:15_000,intervals:[100,250,500]});
  await page.getByRole('button',{name:'아카이브에 질문하기',exact:true}).click();
  await expect(page.getByLabel('질문',{exact:true})).toBeVisible();
  await expect(page.getByLabel('영상 주제',{exact:true})).toHaveCount(0);
  expect(api.requests.retrieve).toHaveLength(0);
  expect(api.requests.generate).toHaveLength(0);
  return api;
}
