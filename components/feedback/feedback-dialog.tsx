'use client';

import {FormEvent,useState} from 'react';
import {MessageSquareText} from 'lucide-react';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {FEEDBACK_MAX_LENGTH,FEEDBACK_NICKNAME_MAX_LENGTH,type FeedbackPage} from '@/lib/feedback/domain';

function currentPage():FeedbackPage{return typeof window!=='undefined'&&window.location.pathname.startsWith('/works')?'works':'news';}

export default function FeedbackDialog({variant='header'}:{variant?:'header'|'rail'}){
  const [open,setOpen]=useState(false);
  const [nickname,setNickname]=useState('');
  const [message,setMessage]=useState('');
  const [tag,setTag]=useState('');
  const [status,setStatus]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [error,setError]=useState('');
  async function submit(event:FormEvent){
    event.preventDefault();
    const normalizedNickname=nickname.trim();
    const normalized=message.trim();
    if(!normalizedNickname){setStatus('error');setError('유튜브 닉네임을 입력해 주세요.');return;}
    if(!normalized){setStatus('error');setError('메모를 입력해 주세요.');return;}
    setStatus('pending');setError('');
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:normalizedNickname,message:normalized,page:currentPage()})});
      const data=await response.json() as {error?:string;tag?:string};
      if(!response.ok)throw new Error(data.error??'메모를 보내지 못했습니다.');
      setMessage('');setTag(data.tag??'');setStatus('success');
    }catch(reason){setStatus('error');setError((reason as Error).message);}
  }
  function changeOpen(value:boolean){setOpen(value);if(!value&&status!=='pending'){setStatus('idle');setError('');setTag('');}}
  const isRail=variant==='rail';
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger asChild><button className={`feedback-entry ${isRail?'feedback-entry-rail':''}`} type="button" aria-label="베타 메모 남기기"><MessageSquareText size={isRail?22:15}/><span className="feedback-entry-copy"><small>{isRail?'BETA FEEDBACK':''}</small><strong>메모 남기기</strong>{isRail&&<em>불편한 점이나 제안을 남겨주세요.</em>}</span><span className="feedback-entry-arrow" aria-hidden="true">↗</span></button></DialogTrigger><DialogContent className="feedback-dialog">
    <DialogHeader><div className="feedback-kicker">HOLOCRON / BETA</div><DialogTitle>메모 남기기</DialogTitle><DialogDescription>유튜브 닉네임과 함께 베타 의견을 남겨주세요. 닉네임은 표시용이며 실제 YouTube 계정 소유 여부를 인증하지 않습니다.</DialogDescription></DialogHeader>
    {status==='success'?<div className="feedback-success" role="status"><strong>메모를 전송했습니다.</strong><span>{tag?`이 브라우저의 익명 사용자 태그 ${tag}로 접수되었습니다.`:'베타 개선에 참고하겠습니다. 감사합니다.'}</span></div>:<form className="feedback-form" onSubmit={submit}><label htmlFor="beta-feedback-nickname">유튜브 닉네임 <small>필수 · 인증 아님</small></label><input id="beta-feedback-nickname" value={nickname} onChange={event=>setNickname(event.target.value)} maxLength={FEEDBACK_NICKNAME_MAX_LENGTH} disabled={status==='pending'} placeholder="유튜브에서 사용하는 닉네임" required autoFocus/><p className="feedback-identity-note">브라우저의 익명 쿠키 태그와 함께 기록됩니다. 반복적인 도배나 악용 시 해당 브라우저의 메모 기능이 제한될 수 있습니다.</p><label htmlFor="beta-feedback">메모</label><textarea id="beta-feedback" value={message} onChange={event=>setMessage(event.target.value)} maxLength={FEEDBACK_MAX_LENGTH} rows={7} disabled={status==='pending'} placeholder="불편했던 점, 좋았던 점, 추가되면 좋을 기능을 적어주세요." required/><div className="feedback-form-meta"><span>{message.length.toLocaleString('ko-KR')} / {FEEDBACK_MAX_LENGTH.toLocaleString('ko-KR')}</span>{status==='error'&&<strong role="alert">{error}</strong>}</div><DialogFooter><DialogClose type="button" className="feedback-cancel" disabled={status==='pending'}>닫기</DialogClose><button type="submit" className="feedback-submit" disabled={status==='pending'||!nickname.trim()||!message.trim()}>{status==='pending'?'전송 중…':'보내기'}</button></DialogFooter></form>}
    {status==='success'&&<DialogFooter><DialogClose className="feedback-submit">닫기</DialogClose></DialogFooter>}
  </DialogContent></Dialog>;
}
