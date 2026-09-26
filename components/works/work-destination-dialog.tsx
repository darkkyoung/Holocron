'use client';

import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {WORK_DESTINATION_URLS} from '@/lib/works/destination';
import type {Work} from '@/lib/works/types';

const TICKETING_OPTIONS=[
  {name:'CGV',url:WORK_DESTINATION_URLS.ticketing.cgv},
  {name:'롯데시네마',url:WORK_DESTINATION_URLS.ticketing.lotteCinema},
  {name:'메가박스',url:WORK_DESTINATION_URLS.ticketing.megabox},
] as const;

export default function WorkDestinationDialog({work,onOpenChange}:{work:Work|null;onOpenChange:(open:boolean)=>void}){
  return <Dialog open={work!==null} onOpenChange={onOpenChange}>
    <DialogContent className="ticketing-dialog">
      <DialogHeader><DialogTitle>예매처를 선택하세요</DialogTitle><DialogDescription>{work?.title}의 예매 페이지로 이동합니다.</DialogDescription></DialogHeader>
      <div className="ticketing-options">{TICKETING_OPTIONS.map(option=><a key={option.name} href={option.url} target="_blank" rel="noopener noreferrer">{option.name}</a>)}</div>
      <DialogFooter showCloseButton/>
    </DialogContent>
  </Dialog>;
}
