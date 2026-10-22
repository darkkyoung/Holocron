'use client';

import {Activity} from 'lucide-react';
import {collectionDiscoveryLabel,formatCollectionHealthTime,type CollectionSourceHealthView} from '@/lib/collection/health';

const statusLabel={healthy:'정상',warning:'주의',danger:'위험',disabled:'비활성',unknown:'확인 전'} as const;

export default function CollectionHealthPanel({items}:{items:CollectionSourceHealthView[]}){
  return <section className="admin-collection-health" aria-labelledby="collection-health-title">
    <h3 id="collection-health-title"><Activity size={14}/> NEWS COLLECTION HEALTH</h3>
    <div className="admin-health-list">{items.map(item=><details key={item.sourceId} className="admin-health-source" data-status={item.status}>
      <summary><span className="admin-health-dot"/><strong>{item.source}</strong><em>{statusLabel[item.status]}</em><small>발견 {item.lastDiscovered} · 신규 {item.lastInserted}</small></summary>
      <div className="admin-health-detail">
        <strong>{item.status==='disabled'?'소스 비활성화 · 아래는 이전 기록':collectionDiscoveryLabel(item)}</strong>
        <span>마지막 확인 <strong>{formatCollectionHealthTime(item.lastCheckedAt)}</strong></span>
        <span>{item.sourceId==='swnn'?'RSS':item.sourceId==='forbes'?'Sitemap':'기본'} {item.lastPrimaryDiscovered} + 보완 {item.lastBackfillDiscovered}</span>
        <span>전체 탐색 최근 정상 <strong>{formatCollectionHealthTime(item.lastHealthyAt??'')}</strong></span>
        {item.discovery&&<>
          <span>기본 최근 성공 <strong>{formatCollectionHealthTime(item.discovery.lastPrimarySuccessAt??'')}</strong></span>
          <span>보완 최근 성공 <strong>{formatCollectionHealthTime(item.discovery.lastBackfillSuccessAt??'')}</strong></span>
          {!!item.discovery.primaryError&&<span className="admin-health-error">기본 오류: {item.discovery.primaryError}</span>}
          {item.discovery.backfillErrors.map((error,index)=><span className="admin-health-error" key={index}>{error}</span>)}
        </>}

        <span>연속 발견 0건 {item.consecutiveZeroDiscoveries}회 · 연속 탐색 장애 {item.consecutiveFailures}회 (기본·보완 합산)</span>
        {!!item.metadataFailure&&<span>메타데이터 검토 {item.metadataFailure}건</span>}
        {!!item.imageLookupFailures&&<span>이미지 조회 실패 {item.imageLookupFailures}건 · {item.imageLookupFailureReasons.join(', ')}</span>}
        {!!item.headlineOnlyFallback&&<span>제목 한정 fallback {item.headlineOnlyFallback}건</span>}
        {!!item.backfillFailures&&<span>보완 요청 실패 {item.backfillFailures}건{item.discovery&&` / ${item.discovery.backfillRequests}회 요청`}</span>}
        <span className="admin-health-error">{item.lastError||'최근 source 오류 없음'}</span>
      </div>
    </details>)}</div>
  </section>;
}
