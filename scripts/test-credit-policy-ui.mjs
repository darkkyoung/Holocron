import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadUiModules} from './assistant-ui-test-loader.mjs';
let count=0;const check=(v,m)=>{assert.ok(v,m);count++;};
const state={values:[],cursor:0,useState(initial){const i=this.cursor++;if(!(i in this.values))this.values[i]=initial;return [this.values[i],v=>{this.values[i]=typeof v==='function'?v(this.values[i]):v;}];}};
globalThis.__policyHooks=state;
const loaded=await loadUiModules(['components/admin/credit-policy-editor.tsx','lib/credit/policy-settings/domain.ts'],{stubs:{react:'export const useState=(...args)=>globalThis.__policyHooks.useState(...args);'}});
const domain=loaded.modules['lib/credit/policy-settings/domain.ts'],Editor=loaded.modules['components/admin/credit-policy-editor.tsx'].default,time='2026-10-18T00:00:00.000Z';
const initial={policy:{version:1,values:{...domain.DEFAULT_CREDIT_POLICY},changedAt:time},appliedAt:Object.fromEntries(Object.keys(domain.DEFAULT_CREDIT_POLICY).map(k=>[k,time])),history:[{version:1,values:{...domain.DEFAULT_CREDIT_POLICY},changedAt:time,previous:null,actor:'system'}],months:[],month:'2026-10',usedMicros:0,remainingMicros:30000000,warning:false,blocked:false};
const tree=()=>{state.cursor=0;return Editor({initial});};
function all(node,predicate,out=[]){if(!node)return out;if(Array.isArray(node)){for(const n of node)all(n,predicate,out);return out;}if(typeof node!=='object')return out;if(predicate(node))out.push(node);all(node.props?.children,predicate,out);return out;}
const button=label=>all(tree(),n=>n.type==='button'&&n.props.children===label)[0];
const field=key=>all(tree(),n=>n.type==='input'&&n.props.id===key)[0];
const previews=()=>all(tree(),n=>n.type==='button'&&n.props.children==='변경 확인');
const savedFetch=globalThis.fetch;let requests=[];let outcome='success';
globalThis.fetch=async(url,init)=>{requests.push({url,init});if(outcome==='conflict')return new Response('',{status:409});if(outcome==='lost')throw Error('private-network-error');const input=JSON.parse(init.body);return Response.json({...initial,policy:{...initial.policy,version:2,values:input.values}});};
try{
 let html=renderToStaticMarkup(tree());check(html.includes('월 AI 예산')&&html.includes('UTC')&&html.includes('KST'),'separate monthly/daily periods');check(html.includes('뉴스 자동 수집')&&html.includes('실제 OpenAI 청구액과 다를'),'billing scope/estimate');check(field('qaCredits').props.value===5&&field('plannerCredits').props.value===7,'saved defaults');check(requests.length===0,'render never mutates or rewards');
 field('qaCredits').props.onChange({target:{value:'9'}});previews()[0].props.onClick();html=renderToStaticMarkup(tree());check(html.includes('5 → 9')&&html.includes('변경 저장'),'diff before save');check(state.values[0].policy.values.qaCredits===5&&requests.length===0,'preview is not optimistic save');button('취소').props.onClick();check(!button('변경 저장')&&requests.length===0,'cancel no network');
 previews()[0].props.onClick();button('변경 저장').props.onClick();await new Promise(r=>setTimeout(r,0));check(requests.length===1,'single explicit mutation');const req=requests[0];check(req.url==='/api/admin/credit-policy'&&req.init.method==='POST'&&req.init.credentials==='same-origin','authenticated same-origin API');const body=JSON.parse(req.init.body);check(body.expectedVersion===1&&body.values.qaCredits===9,'CAS version and server-validated policy body');check(state.values[0].policy.values.qaCredits===9&&renderToStaticMarkup(tree()).includes('저장 완료'),'only confirmed save updates stored values');
 field('qaCredits').props.onChange({target:{value:'0'}});previews()[0].props.onClick();check(!button('변경 저장')&&requests.length===1,'invalid amount cannot enter confirmation');
 field('qaCredits').props.onChange({target:{value:'10'}});previews()[0].props.onClick();outcome='conflict';button('변경 저장').props.onClick();await new Promise(r=>setTimeout(r,0));check(state.values[0].policy.values.qaCredits===9&&renderToStaticMarkup(tree()).includes('다른 관리자 작업'),'conflict retains confirmed values');check(requests.length===2,'no auto retry on conflict');
 previews()[0].props.onClick();outcome='lost';button('변경 저장').props.onClick();await new Promise(r=>setTimeout(r,0));check(state.values[0].policy.values.qaCredits===9&&renderToStaticMarkup(tree()).includes('불명확'),'ambiguous response not called success');check(!renderToStaticMarkup(tree()).includes('private-network-error')&&requests.length===3,'no raw error or automatic retry');
 check(all(tree(),n=>n.type==='input').every(n=>n.props.id&&n.props.min==='1'),'labeled bounded controls');check(renderToStaticMarkup(tree()).includes('aria-live="polite"'),'status live region');
 console.log(`Credit policy UI: ${count} assertions PASS; real JSX and injected interaction state, no browser visual claim.`);
}finally{globalThis.fetch=savedFetch;await loaded.dispose();delete globalThis.__policyHooks;}
