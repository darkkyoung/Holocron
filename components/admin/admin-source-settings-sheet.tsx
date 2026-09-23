'use client';

import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Switch} from '@/components/ui/switch';
import type {SourceId,SourceSettingItem} from '@/lib/collection/source-settings';
import {ArrowUpRight} from 'lucide-react';

type Props={open:boolean;sources:SourceSettingItem[];busy:boolean;onOpenChange:(open:boolean)=>void;onToggle:(sourceId:SourceId,enabled:boolean)=>Promise<void>};

export default function AdminSourceSettingsSheet({open,sources,busy,onOpenChange,onToggle}:Props){
  const active=sources.filter(source=>source.enabled).length;
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="admin-status-sheet admin-source-sheet" side="right">
    <SheetHeader className="admin-sheet-header"><div className="eyebrow">COLLECTION POLICY</div><SheetTitle>뉴스 소스 설정 <span>{active}/{sources.length}</span></SheetTitle><SheetDescription>OFF한 소스는 다음 수집부터 요청하지 않습니다. 기존 기사는 그대로 유지됩니다.</SheetDescription></SheetHeader>
    <div className="admin-source-list">{sources.map(source=><article className="admin-source-setting" key={source.id}>
      <Switch id={`source-${source.id}`} checked={source.enabled} disabled={busy} onCheckedChange={enabled=>onToggle(source.id,enabled)} aria-label={`${source.name} 수집 ${source.enabled?'끄기':'켜기'}`}/>
      <label htmlFor={`source-${source.id}`}><span className="admin-source-state" data-enabled={source.enabled}>{source.enabled?'ON':'OFF'}</span><strong>{source.name}</strong><small>{source.category} · {source.description}</small></label>
      <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.name} 홈페이지 열기`}><ArrowUpRight size={16}/></a>
    </article>)}</div>
  </SheetContent></Sheet>;
}
