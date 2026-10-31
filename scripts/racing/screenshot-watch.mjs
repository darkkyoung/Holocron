// Real isolated Chromium screenshots of the built local watch UI; no production or external fetch.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,normalize} from 'node:path';

const root=resolve('out/galactic-racing-watch');
const shotDir=resolve('out/galactic-racing-watch-qa');
await mkdir(shotDir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4191');
  const path=normalize(url.pathname==='/'?'/index.html':url.pathname).replace(/^[/\\]+/,'');
  const full=resolve(root,path);
  if(!full.startsWith(root+'/')){res.writeHead(403);return res.end();}
  const body=await readFile(full);
  res.writeHead(200,{'content-type':mime[extname(full)]??'application/octet-stream','cache-control':'no-store'});
  res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4191,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4191/',{waitUntil:'networkidle'});
  await page.getByRole('tablist').count().catch(()=>{});
  await page.getByRole('heading',{name:/GALACTIC/}).waitFor();
  await page.getByRole('button',{name:/외부 방해/}).first().click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(160);
  const widthData=await page.evaluate(()=>({screenWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,video:document.querySelector('.broadcast')?.getBoundingClientRect().toJSON(),renderer:document.querySelector('.scene')?.getAttribute('data-renderer')}));
  if(widthData.scrollWidth>widthData.screenWidth+2)throw Error(label+' horizontal overflow '+JSON.stringify(widthData));
  if(errors.length)throw Error(label+' JS page error: '+errors.join(' | '));
  await page.screenshot({path:join(shotDir,'watch-'+label+'.png')});
  await page.getByRole('button',{name:/시상식/}).first().click();
  await page.getByLabel('속도').selectOption('8');
  await page.waitForTimeout(4500);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(160);
  await page.screenshot({path:join(shotDir,'podium-'+label+'.png')});
  const button=page.getByRole('button',{name:'전체화면으로 보기'});
  if(await button.count()){
   await button.click();
   await page.waitForTimeout(100);
   const isFull=await page.evaluate(()=>!!document.fullscreenElement);
   if(isFull)await page.evaluate(()=>document.exitFullscreen());
  }
  console.log(label+' UI passed: '+JSON.stringify(widthData));
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
