'use client';

import {useState,type FormEvent} from 'react';
import {Header} from '@/app/newsroom';
import {SITE_COPY_LIMITS,type SiteCopy} from '@/lib/site-copy';

type Field={key:keyof SiteCopy;label:string;multiline?:boolean;help?:string};
type Group={title:string;caption:string;fields:Field[]};

const GROUPS:Group[]=[
  {title:'뉴스 대문',caption:'NEWS HERO',fields:[
    {key:'newsHeroEyebrow',label:'상단 영문 문구'},
    {key:'newsHeroTitle',label:'메인 제목'},
    {key:'newsHeroHighlight',label:'강조 제목'},
    {key:'newsHeroDescription',label:'설명',multiline:true},
  ]},
  {title:'뉴스 소스 / 설명 카드',caption:'NEWS RAIL',fields:[
    {key:'newsSourceDescription',label:'뉴스 소스 설명'},
    {key:'newsExplainerTitle',label:'설명 카드 제목'},
    {key:'newsExplainerBody',label:'설명 카드 본문',multiline:true},
    {key:'newsExplainerHint',label:'설명 카드 안내문',multiline:true},
    {key:'newsRailFooterTitle',label:'하단 팬 아카이브 문구'},
    {key:'newsRailFooterDisclaimer',label:'하단 비제휴 문구'},
  ]},
  {title:'공통 하단',caption:'SITE FOOTER',fields:[
    {key:'siteFooterTagline',label:'하단 태그라인'},
    {key:'siteFooterLegal',label:'권리 안내 문구',multiline:true},
  ]},
  {title:'작품 대문',caption:'WORKS HERO',fields:[
    {key:'worksHeroEyebrow',label:'상단 영문 문구'},
    {key:'worksHeroTitle',label:'메인 제목'},
    {key:'worksHeroHighlight',label:'강조 제목'},
    {key:'worksHeroDescription',label:'설명',multiline:true},
  ]},
  {title:'메모 전송 완료',caption:'FEEDBACK SUCCESS',fields:[
    {key:'feedbackSuccessTitle',label:'완료 제목'},
    {key:'feedbackSuccessDescription',label:'완료 안내',multiline:true,help:'{tag}를 넣으면 익명 사용자 태그가 표시됩니다.'},
  ]},
];

export default function SiteCopyAdmin({initialCopy}:{initialCopy:SiteCopy}){
  const [copy,setCopy]=useState(initialCopy);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  function update(key:keyof SiteCopy,value:string){setCopy(current=>({...current,[key]:value}));}

  async function request(action:'save'|'reset',payload?:SiteCopy){
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/site-copy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,copy:payload})});
      const data=await response.json() as {copy?:SiteCopy;error?:string};
      if(!response.ok||!data.copy)throw new Error(data.error??'사이트 문구를 저장하지 못했습니다.');
      setCopy(data.copy);
      setMessage(action==='save'?'사이트 문구를 저장했습니다. 공개 페이지를 새로고침하면 바로 반영됩니다.':'기본 문구로 되돌렸습니다.');
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }

  function submit(event:FormEvent){event.preventDefault();void request('save',copy);}
  function reset(){if(window.confirm('사이트 문구를 모두 기본값으로 되돌릴까요?'))void request('reset');}

  return <><Header admin/><main className="shell site-copy-admin">
    <section className="site-copy-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / SITE COPY</div><h1>사이트 <span>문구 관리</span></h1><p>공개 뉴스·작품 페이지의 고정 문구만 수정합니다. 기사 내용과 작품 데이터에는 영향을 주지 않습니다.</p></div><nav aria-label="관리자 화면 이동"><a href="/admin">뉴스 관리</a><a href="/admin/works">작품 관리</a><a href="/admin/analytics">Beta Analytics</a></nav></section>
    {message&&<p className="admin-message" role="status">{message}</p>}
    <form className="site-copy-form" onSubmit={submit}>
      {GROUPS.map(group=><section className="site-copy-group" key={group.caption}><div className="site-copy-group-heading"><div><h2>{group.title}</h2><small>{group.caption}</small></div></div><div className="site-copy-fields">{group.fields.map(field=><label key={field.key}><span>{field.label}<small>{copy[field.key].length} / {SITE_COPY_LIMITS[field.key]}</small></span>{field.multiline?<textarea rows={3} value={copy[field.key]} maxLength={SITE_COPY_LIMITS[field.key]} disabled={busy} onChange={event=>update(field.key,event.target.value)}/>:<input value={copy[field.key]} maxLength={SITE_COPY_LIMITS[field.key]} disabled={busy} onChange={event=>update(field.key,event.target.value)}/>} {field.help&&<small className="site-copy-field-help">{field.help}</small>}</label>)}</div></section>)}
      <div className="site-copy-actions"><button type="button" className="secondary" disabled={busy} onClick={reset}>기본값으로 되돌리기</button><button type="submit" disabled={busy}>{busy?'저장 중…':'사이트 문구 저장'}</button></div>
    </form>
  </main></>;
}
