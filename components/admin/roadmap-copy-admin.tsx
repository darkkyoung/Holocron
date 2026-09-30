'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {Header} from '@/app/newsroom';
import Roadmap from '@/components/roadmap/roadmap';
import {ROADMAP_COPY_LIMITS,type RoadmapCopy} from '@/lib/roadmap-copy';
import styles from './roadmap-copy-admin.module.css';

type Field={key:string;label:string;limit:number;multiline?:boolean};
type Group={id:string;title:string;caption:string;fields:Field[]};
const limits=ROADMAP_COPY_LIMITS;
const hero:Group={id:'hero',title:'대문',caption:'HERO',fields:[
  {key:'hero.coordinates',label:'좌표 문구',limit:limits.coordinates},{key:'hero.eyebrow',label:'상단 영문 문구',limit:limits.eyebrow},
  {key:'hero.titlePrimary',label:'메인 제목',limit:limits.titlePrimary},{key:'hero.titleAccent',label:'강조 제목',limit:limits.titleAccent},
  {key:'hero.tagline',label:'한국어 태그라인 (줄바꿈 가능)',limit:limits.tagline,multiline:true},{key:'hero.guide',label:'안내 문구',limit:limits.guide,multiline:true},
]};
function stageGroup(id:'available'|'next'|'exploring',title:string,count:number):Group{
  return {id,title,caption:id.toUpperCase(),fields:[
    {key:`${id}.marker`,label:'단계 표시',limit:limits.marker},{key:`${id}.label`,label:'영문 단계명 (항목 번호에도 사용)',limit:limits.label},
    {key:`${id}.title`,label:'섹션 제목',limit:limits.title},{key:`${id}.note`,label:'섹션 설명',limit:limits.note,multiline:true},
    ...Array.from({length:count},(_,index):Field[]=>[
      {key:`${id}.items.${index}.title`,label:`항목 ${String(index+1).padStart(2,'0')} / 제목`,limit:limits.itemTitle},
      {key:`${id}.items.${index}.description`,label:`항목 ${String(index+1).padStart(2,'0')} / 설명`,limit:limits.itemDescription,multiline:true},
    ]).flat(),...(id==='exploring'?[{key:'longTermItemLabel',label:'장기 아이디어 항목 표시',limit:limits.longTermItemLabel}]:[]),
  ]};
}
const GROUPS=[hero,stageGroup('available','지금 탐색할 수 있는 것',3),stageGroup('next','다음으로 넓어지는 탐색',4),stageGroup('exploring','멀리 바라보는 방향',4)];

function getValue(copy:RoadmapCopy,key:string):string{
  if(key==='longTermItemLabel')return copy.longTermItemLabel;
  const parts=key.split('.');
  let value:unknown=parts[0]==='hero'?copy.hero:copy.stages[parts.shift() as keyof RoadmapCopy['stages']];
  if(parts[0]==='hero')parts.shift();
  for(const part of parts)value=Array.isArray(value)?value[Number(part)]:(value as Record<string,unknown>)[part];
  return value as string;
}

function updateValue(copy:RoadmapCopy,key:string,value:string):RoadmapCopy{
  const next=structuredClone(copy);
  if(key==='longTermItemLabel'){next.longTermItemLabel=value;return next;}
  const parts=key.split('.');
  let target:unknown=parts[0]==='hero'?next.hero:next.stages[parts.shift() as keyof RoadmapCopy['stages']];
  if(parts[0]==='hero')parts.shift();
  for(const part of parts.slice(0,-1))target=Array.isArray(target)?target[Number(part)]:(target as Record<string,unknown>)[part];
  (target as Record<string,string>)[parts.at(-1)!]=value;
  return next;
}

export default function RoadmapCopyAdmin({initialCopy}:{initialCopy:RoadmapCopy}){
  const [draft,setDraft]=useState(initialCopy),[saved,setSaved]=useState(initialCopy),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const dirty=JSON.stringify(draft)!==JSON.stringify(saved);

  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);

  function focusField(key:string){
    setSelected(key);const input=document.getElementById(`roadmap-field-${key}`);if(!input)return;const group=input.closest('details');if(group)group.open=true;
    requestAnimationFrame(()=>{input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});});
  }

  async function request(action:'save'|'reset',copy?:RoadmapCopy){
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/roadmap-copy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,copy})});
      const data=await response.json() as {copy?:RoadmapCopy;error?:string};
      if(!response.ok||!data.copy)throw new Error(data.error??'로드맵 문구를 저장하지 못했습니다.');
      setDraft(data.copy);setSaved(data.copy);setMessage(action==='save'?'로드맵 문구를 저장했습니다. 공개 페이지를 새로고침하면 바로 반영됩니다.':'기본 문구로 되돌렸습니다.');
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }

  function submit(event:FormEvent){
    event.preventDefault();
    for(const field of GROUPS.flatMap(group=>group.fields)){
      const value=getValue(draft,field.key).trim();
      if(!value||value.length>field.limit){setMessage(`${field.label}: 필수 문구이며 최대 ${field.limit}자까지 입력할 수 있습니다.`);focusField(field.key);return;}
    }
    void request('save',draft);
  }
  function reset(){if(window.confirm('로드맵 문구를 모두 기본값으로 되돌릴까요?'))void request('reset');}

  return <><Header admin archive="roadmap"/><main className={styles.page}>
    <header className={styles.heading}><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / ROADMAP CONTROL</div><h1>로드맵 <span>문구 관리</span></h1><p>공개 로드맵의 문구를 수정하고 저장 전에 실제 화면에서 확인할 수 있습니다.</p></div><a href="/admin">관리자 홈</a></header>
    {message&&<p className="admin-message" role="status">{message}</p>}
    <div className={styles.workspace}><form className={styles.editor} onSubmit={submit} noValidate>
      <div className={styles.editorTop}><h2>ROADMAP COPY EDITOR</h2>{dirty&&<span>저장되지 않은 변경사항</span>}</div><p className={styles.hint}>오른쪽 미리보기에서 문구를 선택하면 해당 입력칸으로 이동합니다.</p>
      {GROUPS.map(group=><details className={styles.group} key={group.id} open={group.id==='hero'?true:undefined}><summary><span>{group.caption}<strong>{group.title}</strong></span><small>{group.fields.length}개 문구</small></summary><div className={styles.fields}>{group.fields.map(field=>{
        const value=getValue(draft,field.key);return <label className={selected===field.key?styles.activeField:''} key={field.key} htmlFor={`roadmap-field-${field.key}`}><span>{field.label}<small>{value.length} / {field.limit}</small></span>{field.multiline?<textarea id={`roadmap-field-${field.key}`} rows={3} value={value} maxLength={field.limit} disabled={busy} onFocus={()=>setSelected(field.key)} onChange={event=>setDraft(current=>updateValue(current,field.key,event.target.value))}/>:<input id={`roadmap-field-${field.key}`} value={value} maxLength={field.limit} disabled={busy} onFocus={()=>setSelected(field.key)} onChange={event=>setDraft(current=>updateValue(current,field.key,event.target.value))}/>}</label>;
      })}</div></details>)}
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={reset}>기본 문구로 되돌리기</button><button type="submit" disabled={busy||!dirty}>{busy?'저장 중…':'변경사항 저장'}</button></div>
    </form><aside className={styles.preview} aria-label="로드맵 실시간 미리보기"><div className={styles.previewHeader}><strong>LIVE PREVIEW</strong><span>저장 전 미리보기 · 공개 문구는 저장할 때만 변경됩니다.</span></div><div className={styles.previewScroll}><div className={styles.previewCanvas}><Roadmap content={draft} previewMode selectedCopyKey={selected} onCopySelect={focusField}/></div></div></aside></div>
  </main></>;
}
