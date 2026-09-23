'use client';

import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Switch} from '@/components/ui/switch';
import type {SourceId,SourceSettingItem} from '@/lib/collection/source-settings';
import {ArrowUpRight} from 'lucide-react';

type Props={open:boolean;sources:SourceSettingItem[];busy:boolean;onOpenChange:(open:boolean)=>void;onToggle:(sourceId:SourceId,enabled:boolean)=>Promise<void>};

export default function AdminSourceSettingsSheet({open,sources,busy,onOpenChange,onToggle}:Props){
  const active=sources.filter(source=>source.enabled).length;
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="admin-status-sheet admin-source-sheet" side="right">
    <SheetHeader className="admin-sheet-header"><div className="eyebrow">ARCHIVE POLICY</div><SheetTitle>뉴스 소스 설정 <span>{active}/{sources.length}</span></SheetTitle><SheetDescription>소스를 끄면 이후 수집을 중지하고, 해당 소스의 기존 기사도 뉴스 아카이브에서 숨깁니다. 다시 켜면 삭제 없이 복원됩니다.</SheetDescription></SheetHeader>
    <div className="admin-source-list">{sources.map(source=><article className="admin-source-setting" key={source.id}>
      <Switch id={`source-${source.id}`} checked={source.enabled} disabled={busy} onCheckedChange={enabled=>onToggle(source.id,enabled)} aria-label={`${source.name} 수집 ${source.enabled?'끄기':'켜기'}`}/>
      <label htmlFor={`source-${source.id}`}><span className="admin-source-state" data-enabled={source.enabled}>{source.enabled?'ON':'OFF'}</span><strong>{source.name}</strong><small className="admin-source-policy">{source.enabled?'수집 및 아카이브 표시':'수집 중지 · 아카이브에서 숨김'}</small><small>{source.category} · {source.description}</small></label>
      <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.name} 홈페이지 열기`}><ArrowUpRight size={16}/></a>
    </article>)}</div>
  </SheetContent></Sheet>;
}
