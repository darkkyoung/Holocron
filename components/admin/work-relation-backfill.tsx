'use client';
import {useState} from 'react';
import type {AssociationReport} from '@/lib/news-work/types';

export default function WorkRelationBackfill(){
  const [busy,setBusy]=useState(false),[cursor,setCursor]=useState<string|null>(null),[message,setMessage]=useState('');
  async function run(){setBusy(true);try{
    const response=await fetch('/api/admin/news-work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'backfill',cursor:cursor??''})});
    if(!response.ok)throw new Error('관련 작품 재검사에 실패했습니다. 같은 구간을 다시 시도할 수 있습니다.');
    const result=await response.json() as AssociationReport;setCursor(result.nextCursor);
    setMessage(`이번 구간: 기사 ${result.inspected}건 확인 · 관계 ${result.added}건 추가 · 모호 ${result.ambiguous}건 · 미일치 ${result.unmatched}건 · 수동 상태 ${result.manualPreserved}건 보존${result.nextCursor?' · 다음 구간 있음':' · 검사 완료'}`);
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <section className="admin-schedule-setting"><button className="admin-logout-button" type="button" disabled={busy} onClick={()=>void run()}>{busy?'작품 연결 검사 중…':cursor?'관련 작품 다음 200건':'관련 작품 재검사'}</button><small>기존 기사에 명확한 작품만 연결합니다. 반복 실행해도 수동 결정은 유지됩니다.</small>{message&&<small role="status">{message}</small>}</section>;
}
