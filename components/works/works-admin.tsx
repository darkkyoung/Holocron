'use client';

import {useState} from 'react';
import {Header} from '@/app/newsroom';
import WorksArchive from './works-archive';
import type {Work,WorkStatus,WorksByStatus} from '@/lib/works/types';

type State={sections:WorksByStatus;error?:string};
const statusLabel:Record<WorkStatus,string>={upcoming:'공개 예정',recent:'최근 공개',archive:'아카이브'};

export default function WorksAdmin({initialState}:{initialState:State}){
  const [sections,setSections]=useState(initialState.sections);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  async function refresh(){const response=await fetch('/api/admin/works');const data=await response.json() as State;if(!response.ok)throw new Error(data.error??'작품을 불러오지 못했습니다.');setSections(data.sections);}
  async function update(work:Work,status:WorkStatus){setBusy(work.id);setMessage('');try{const response=await fetch('/api/admin/works',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:work.id,status})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error??'상태를 저장하지 못했습니다.');await refresh();setMessage(`${work.title} 상태를 ${statusLabel[status]}로 저장했습니다.`);}catch(error){setMessage((error as Error).message);}finally{setBusy(null);}}
  return <><Header admin archive="works"/><main className="shell works-shell"><section className="works-admin-intro"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / CONTROL ROOM</div><h1>Works <span>Administrator</span></h1><p>공개 작품 카드와 같은 구조에서 작품 상태만 직접 관리합니다.</p></div><a className="works-admin-link" href="/admin">뉴스 관리로 돌아가기</a></section>{message&&<p role="status" className="admin-message">{message}</p>}<p className="work-admin-notice">상태는 자동으로 변경되지 않습니다. 편집한 값은 새 수집이나 뉴스 관리에 영향을 주지 않습니다.</p><WorksArchive sections={sections} renderControl={work=><label>공개 상태<select aria-label={`${work.title} 상태`} value={work.status} disabled={busy===work.id} onChange={event=>update(work,event.target.value as WorkStatus)}><option value="upcoming">공개 예정</option><option value="recent">최근 공개</option><option value="archive">아카이브</option></select></label>}/></main></>;
}
