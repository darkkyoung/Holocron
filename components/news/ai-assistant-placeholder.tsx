'use client';

import {useState} from 'react';
import {Bot} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import styles from './ai-assistant-placeholder.module.css';

export default function AiAssistantPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={styles.launcher}
            type="button"
            aria-haspopup="dialog"
            aria-label="AI 도우미 열기"
            title="AI 도우미 안내 열기"
          >
            <Bot size={22} aria-hidden="true"/><span>AI 도우미</span>
          </button>
        </DialogTrigger>
        <DialogContent className={styles.dialog} showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className={styles.dialogTitle}>AI 도우미</DialogTitle>
            <DialogDescription className={styles.dialogDescription}>
              <span className={styles.comingSoon}>COMING SOON</span>
              <span>AI 도우미는 준비 중입니다.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={styles.dialogFooter}>
            <DialogClose asChild>
              <button className={styles.closeButton} type="button" aria-label="AI 도우미 안내 닫기">
                닫기
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
