'use client';

import {FormEvent,useState} from 'react';
import {MessageSquareText} from 'lucide-react';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {FEEDBACK_MAX_LENGTH,type FeedbackPage} from '@/lib/feedback/domain';

function currentPage():FeedbackPage{return typeof window!=='undefined'&&window.location.pathname.startsWith('/works')?'works':'news';}

export default function FeedbackDialog(){
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState('');
  const [status,setStatus]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [error,setError]=useState('');
  async function submit(event:FormEvent){
    event.preventDefault();
    const normalized=message.trim();
    if(!normalized){setStatus('error');setError('메모를 입력해 주세요.');return;}
    setStatus('pending');setError('');
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:normalized,page:currentPage()})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'메모를 보내지 못했습니다.');
      setMessage('');setStatus('success');
    }catch(reason){setStatus('error');setError((reason as Error).message);}
  }
  function changeOpen(value:boolean){setOpen(value);if(!value&&status!=='pending'){setStatus('idle');setError('');}}
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger asChild><button className="feedback-entry" type="button" aria-label="베타 메모 남기기"><MessageSquareText size={15}/><span>메모 남기기</span></button></DialogTrigger><DialogContent className="feedback-dialog">
    <DialogHeader><div className="feedback-kicker">HOLOCRON / BETA</div><DialogTitle>메모 남기기</DialogTitle><DialogDescription>사용하며 느낀 점이나 불편한 부분을 짧게 알려주세요. 이름이나 이메일은 받지 않습니다.</DialogDescription></DialogHeader>
    {status==='success'?<div className="feedback-success" role="status"><strong>메모를 전송했습니다.</strong><span>베타 개선에 참고하겠습니다. 감사합니다.</span></div>:<form className="feedback-form" onSubmit={submit}><label htmlFor="beta-feedback">메모</label><textarea id="beta-feedback" value={message} onChange={event=>setMessage(event.target.value)} maxLength={FEEDBACK_MAX_LENGTH} rows={7} disabled={status==='pending'} placeholder="불편했던 점, 좋았던 점, 추가되면 좋을 기능을 적어주세요." required autoFocus/><div className="feedback-form-meta"><span>{message.length.toLocaleString('ko-KR')} / {FEEDBACK_MAX_LENGTH.toLocaleString('ko-KR')}</span>{status==='error'&&<strong role="alert">{error}</strong>}</div><DialogFooter><DialogClose type="button" className="feedback-cancel" disabled={status==='pending'}>닫기</DialogClose><button type="submit" className="feedback-submit" disabled={status==='pending'||!message.trim()}>{status==='pending'?'전송 중…':'보내기'}</button></DialogFooter></form>}
    {status==='success'&&<DialogFooter><DialogClose className="feedback-submit">닫기</DialogClose></DialogFooter>}
  </DialogContent></Dialog>;
}
