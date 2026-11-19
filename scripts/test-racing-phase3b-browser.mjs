import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve('wrangler'))('esbuild');
const {chromium}=require('@playwright/test');const assert=require('node:assert/strict');
(async()=>{
await mkdir('out',{recursive:true});
const js=await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Console from './app/admin/racing/console';createRoot(document.getElementById('root')).render(<Console/>);",resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',write:false,define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({channel:'chrome'});
try{for(const width of [1440,390,360]){const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
const rows=[{id:'regular:2026-12-07:R1',season_id:'regular:2026-12-07',round_no:1,qualifying_at:1796641200000,starts_at:1796644800000,state:'SEALED',revision:0}];let commands=0;
await page.route('http://local.test/**',async route=>{
const u=new URL(route.request().url());if(u.pathname==='/api/admin/racing'){if(route.request().method()==='POST'){const body=route.request().postDataJSON();assert.equal(body.revision,0);assert.equal(body.reason,'시설 점검');assert.equal(body.action,'cancel');rows[0].state='CANCELLED';commands++;}return route.fulfill({json:{role:'incident',races:rows,profiles:[]}});}
return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><div id=root></div>'});});
await page.goto('http://local.test/');await page.addScriptTag({content:js.outputFiles[0].text});
await page.getByText('취소 검토').click();assert(await page.getByText('경기 취소 확정').isDisabled());await page.getByLabel('취소 사유').fill('시설 점검');await page.getByText('경기 취소 확정').click();await page.getByText(/CANCELLED/).waitFor();assert.equal(commands,1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'out/admin-'+width+'.png'});await page.close();console.log('PASS Chromium isolated UI with fixture HTTP, viewport',width);
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
