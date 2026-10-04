'use client';

import {Activity} from 'lucide-react';
import {formatCollectionHealthTime,type CollectionSourceHealthView} from '@/lib/collection/health';

const statusLabel={healthy:'정상',warning:'주의',danger:'위험',disabled:'비활성',unknown:'확인 전'} as const;

export default function CollectionHealthPanel({items}:{items:CollectionSourceHealthView[]}){
  return <section className="admin-collection-health" aria-labelledby="collection-health-title">
    <h3 id="collection-health-title"><Activity size={14}/> NEWS COLLECTION HEALTH</h3>
    <div className="admin-health-list">{items.map(item=><details key={item.sourceId} className="admin-health-source" data-status={item.status}>
      <summary><span className="admin-health-dot"/><strong>{item.source}</strong><em>{statusLabel[item.status]}</em><small>발견 {item.lastDiscovered} · 신규 {item.lastInserted}</small></summary>
      <div className="admin-health-detail">
        <span>마지막 확인 <strong>{formatCollectionHealthTime(item.lastCheckedAt)}</strong></span>
        {item.sourceId==='swnn'&&<span>RSS {item.lastPrimaryDiscovered} + backfill {item.lastBackfillDiscovered}</span>}
        <span>연속 0건 {item.consecutiveZeroDiscoveries}회 · 연속 실패 {item.consecutiveFailures}회</span>
        {!!item.metadataFailure&&<span>metadata fallback {item.metadataFailure}건</span>}
        {!!item.headlineOnlyFallback&&<span>제목 한정 fallback {item.headlineOnlyFallback}건</span>}
        {!!item.backfillFailures&&<span>archive 요청 실패 {item.backfillFailures}건</span>}
        <span className="admin-health-error">{item.lastError||'최근 source 오류 없음'}</span>
      </div>
    </details>)}</div>
  </section>;
}
