'use client';

import {useState} from 'react';
import {Header} from '@/app/newsroom';
import WorksArchive from './works-archive';
import WorkForm,{type WorkFormValue} from './work-form';
import TmdbImporter from './tmdb-importer';
import type {Work,WorkStatus,WorksByStatus} from '@/lib/works/types';

type State={sections:WorksByStatus;error?:string};
const statusLabel:Record<WorkStatus,string>={upcoming:'공개 예정',recent:'최근 공개',archive:'아카이브'};
type Editor={mode:'create';initialValue?:WorkFormValue}|{mode:'edit';work:Work;initialValue?:WorkFormValue};

export default function WorksAdmin({initialState}:{initialState:State}){
  const [sections,setSections]=useState(initialState.sections);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [editor,setEditor]=useState<Editor|null>(null);
  const [importerOpen,setImporterOpen]=useState(false);
  async function refresh(){const response=await fetch('/api/admin/works');const data=await response.json() as State;if(!response.ok)throw new Error(data.error??'작품을 불러오지 못했습니다.');setSections(data.sections);}
  async function request(body:unknown){const response=await fetch('/api/admin/works',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error??'작품을 저장하지 못했습니다.');await refresh();}
  async function updateStatus(work:Work,status:WorkStatus){setBusy(work.id);setMessage('');try{await request({id:work.id,status});setMessage(`${work.title} 상태를 ${statusLabel[status]}로 저장했습니다.`);}catch(error){setMessage((error as Error).message);}finally{setBusy(null);}}
  async function save(value:WorkFormValue){const editing=editor;if(!editing)return;setBusy(editing.mode==='edit'?editing.work.id:'create');setMessage('');try{await request(editing.mode==='edit'?{action:'update',id:editing.work.id,work:value}:{action:'create',work:value});setMessage(editing.mode==='edit'?`${value.title} 정보를 저장했습니다.`:`${value.title} 작품을 등록했습니다.`);setEditor(null);}catch(error){setMessage((error as Error).message);}finally{setBusy(null);}}
  async function remove(work:Work){if(!window.confirm(`${work.title} 작품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`))return;setBusy(work.id);setMessage('');try{await request({action:'delete',id:work.id});setMessage(`${work.title} 작품을 삭제했습니다.`);}catch(error){setMessage((error as Error).message);}finally{setBusy(null);}}
  return <><Header admin archive="works"/><main className="shell works-shell"><section className="works-admin-intro"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / CONTROL ROOM</div><h1>Works <span>Administrator</span></h1><p>공개 작품 카드와 같은 구조에서 카탈로그와 상태를 직접 관리합니다.</p></div><div className="works-admin-top-actions"><button className="work-create-button" onClick={()=>setEditor({mode:'create'})}>+ 작품 등록</button><button className="work-tmdb-button" onClick={()=>setImporterOpen(true)}>TMDB에서 가져오기</button><a className="works-admin-link" href="/admin">뉴스 관리로 돌아가기</a></div></section>{message&&<p role="status" className="admin-message">{message}</p>}<p className="work-admin-notice">카탈로그 변경은 Works에만 저장됩니다. 뉴스 수집·주제·상태에는 영향을 주지 않습니다.</p><WorksArchive sections={sections} renderControl={work=><div className="work-admin-actions"><label>공개 상태<select aria-label={`${work.title} 상태`} value={work.status} disabled={busy===work.id} onChange={event=>updateStatus(work,event.target.value as WorkStatus)}><option value="upcoming">공개 예정</option><option value="recent">최근 공개</option><option value="archive">아카이브</option></select></label><button type="button" onClick={()=>setEditor({mode:'edit',work})} disabled={busy===work.id}>편집</button><button type="button" className="work-delete-button" onClick={()=>void remove(work)} disabled={busy===work.id}>삭제</button></div>}/></main>{importerOpen&&<TmdbImporter onClose={()=>setImporterOpen(false)} onUseCandidate={(value,work)=>{setImporterOpen(false);setEditor(work?{mode:'edit',work,initialValue:value}:{mode:'create',initialValue:value});}}/>}{editor&&<WorkForm key={editor.mode==='edit'?editor.work.id:'create'} work={editor.mode==='edit'?editor.work:undefined} initialValue={editor.initialValue} onCancel={()=>setEditor(null)} onSave={save} busy={busy!==null}/>}</>;
}
