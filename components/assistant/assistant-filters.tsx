import type {FilterChoices,FilterDraft} from './contracts';
import styles from './assistant-workspace.module.css';

export default function AssistantFilters({workOptions,categories,sources,filters,disabled,onChange}:FilterChoices&{filters:FilterDraft;disabled:boolean;onChange:(patch:Partial<FilterDraft>)=>void}){
  return <details className={styles.advanced}><summary>상세 검색 설정</summary><div className={styles.filters}>
    <label>관련 작품<select value={filters.workId} disabled={disabled} onChange={e=>onChange({workId:e.target.value})}><option value="">자동 찾기 / 전체</option>{workOptions.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
    <label>카테고리<select value={filters.category} disabled={disabled} onChange={e=>onChange({category:e.target.value})}><option value="">전체</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label>게시 시작일<input type="date" value={filters.dateFrom} disabled={disabled} onChange={e=>onChange({dateFrom:e.target.value})}/></label>
    <label>게시 종료일<input type="date" value={filters.dateTo} disabled={disabled} onChange={e=>onChange({dateTo:e.target.value})}/></label>
    <fieldset><legend>출처 제한 · 최대 7곳</legend><div className={styles.sourceFilters}>{sources.map(s=><label key={s.id}><input type="checkbox" checked={filters.sourceIds.includes(s.id)} disabled={disabled} onChange={()=>onChange({sourceIds:filters.sourceIds.includes(s.id)?filters.sourceIds.filter(id=>id!==s.id):[...filters.sourceIds,s.id]})}/>{s.name}</label>)}</div></fieldset>
  </div></details>;
}
