'use client';

import {useState} from 'react';
import {Sparkles} from 'lucide-react';
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
    <section className={styles.card} aria-labelledby="ai-assistant-card-title">
      <div className={styles.heading}>
        <Sparkles className={styles.icon} size={17} aria-hidden="true" />
        <h3 className={styles.title} id="ai-assistant-card-title">AI 도우미</h3>
        <span className={styles.badge}>BETA</span>
      </div>
      <p className={styles.description}>
        HOLOCRON의 뉴스 아카이브를 바탕으로 소식 탐색과 콘텐츠 정리를 도와드릴 예정입니다.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={styles.openButton}
            type="button"
            aria-haspopup="dialog"
            title="AI 도우미 안내 열기"
          >
            AI 도우미 열기
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
    </section>
  );
}
