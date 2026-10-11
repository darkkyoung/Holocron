'use client';
import {useState} from 'react';

export default function BackupDownload(){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function download(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/backup',{method:'POST',cache:'no-store'});
      if(!response.ok){const body:unknown=await response.json();throw new Error(body&&typeof body==='object'&&'error' in body&&typeof body.error==='string'?body.error:'백업 다운로드에 실패했습니다.');}
      const filename=response.headers.get('content-disposition')?.match(/filename="(holocron-backup-[\w.-]+\.json)"/)?.[1];
      if(!filename)throw new Error('백업 응답을 확인할 수 없습니다.');
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
      link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setError(error instanceof Error?error.message:'백업 다운로드에 실패했습니다.');}
    finally{setBusy(false);}
  }
  return <section className="admin-schedule-setting" aria-label="데이터 백업"><strong>DATA BACKUP</strong><small>주요 D1 데이터를 JSON으로 내려받습니다. 잠금·로그인 제한 등 임시 상태는 제외됩니다.</small><button type="button" className="admin-logout-button" disabled={busy} onClick={()=>void download()}>{busy?'백업 생성 중…':'D1 백업 다운로드'}</button>{error&&<small role="alert">{error}</small>}</section>;
}
