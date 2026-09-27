'use client';

import {useState} from 'react';
import {Header} from '@/app/newsroom';
import type {FeedbackUserSummary} from '@/lib/feedback/users-repository';

function formatTime(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'시각 확인 필요':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

export default function FeedbackUsersAdmin({initialUsers}:{initialUsers:FeedbackUserSummary[]}){
  const [users,setUsers]=useState(initialUsers);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState('');

  async function setBanned(tag:string,banned:boolean){
    setBusy(tag);setMessage('');
    try{
      const response=await fetch('/api/admin/feedback-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag,banned})});
      const data=await response.json() as {users?:FeedbackUserSummary[];error?:string};
      if(!response.ok||!data.users)throw new Error(data.error??'피드백 사용자 상태를 저장하지 못했습니다.');
      setUsers(data.users);setMessage(banned?`${tag}의 메모 전송을 차단했습니다.`:`${tag}의 메모 차단을 해제했습니다.`);
    }catch(error){setMessage((error as Error).message);}finally{setBusy(null);}
  }

  return <><Header admin/><main className="shell feedback-users-admin">
    <section className="feedback-users-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / BETA FEEDBACK</div><h1>피드백 <span>사용자 관리</span></h1><p>메모를 보낸 브라우저를 익명 태그로 구분하고 필요할 때 해당 세션의 메모 전송만 차단합니다.</p></div><nav aria-label="관리자 화면 이동"><a href="/admin">뉴스 관리</a><a href="/admin/site-copy">사이트 문구</a><a href="/admin/analytics">Beta Analytics</a></nav></section>
    <div className="feedback-users-note"><strong>식별 범위</strong><span>IP·이메일·실명은 저장하지 않습니다. 태그는 HOLOCRON 익명 쿠키 기반이므로 쿠키 삭제, 다른 브라우저·기기 사용으로 새 태그를 받을 수 있습니다.</span></div>
    {message&&<p className="admin-message" role="status">{message}</p>}
    <section className="feedback-users-list" aria-label="피드백 사용자 목록">
      <div className="feedback-users-list-heading"><strong>{users.length} 사용자</strong><span>최근 활동순 · 차단 사용자는 상단 표시</span></div>
      {users.map(user=><article className="feedback-user-card" key={user.tag} data-banned={user.banned||undefined}><div className="feedback-user-main"><div><strong>{user.nickname}</strong><code>{user.tag}</code></div><span className="feedback-user-state">{user.banned?'메모 차단':'정상'}</span></div><dl><div><dt>전송 메모</dt><dd>{user.messageCount}건</dd></div><div><dt>첫 확인</dt><dd>{formatTime(user.firstSeenAt)}</dd></div><div><dt>최근 활동</dt><dd>{formatTime(user.lastSeenAt)}</dd></div></dl><div className="feedback-user-actions"><small>닉네임은 사용자가 직접 입력한 표시 정보이며 YouTube 인증 정보가 아닙니다.</small><button type="button" className={user.banned?'secondary':'danger'} disabled={busy===user.tag} onClick={()=>void setBanned(user.tag,!user.banned)}>{busy===user.tag?'저장 중…':user.banned?'차단 해제':'메모 차단'}</button></div></article>)}
      {!users.length&&<p className="works-empty">아직 메모를 보낸 사용자가 없습니다.</p>}
    </section>
  </main></>;
}
