import styles from './assistant-workspace.module.css';

// Deliberately no submit action, price, or Provider request in the draft preview.
export default function ScriptDraftPreview(){
  return <details className={styles.draftPreview}><summary>대본 초안 작성 · 준비 중</summary>
    <p>현재 제공하는 영상 구성 가이드는 완성 내레이션 대본이 아닙니다.</p>
    <fieldset disabled><legend>초안 입력 · 준비 중</legend><label>형식<select aria-label="준비 중인 대본 형식"><option>내레이션 대본</option></select></label><label>대본 방향<textarea rows={2} placeholder="주제·시청자·톤을 입력하는 기능이 준비 중입니다."/></label></fieldset>
    <section aria-label="대본 초안 결과 · 준비 중"><strong>초안 결과</strong><p>별도 가격·출력 계약·근거 검증·Credit 정산 검증 후 제공할 예정입니다. 현재 생성하거나 Credit을 사용할 수 없습니다.</p></section>
  </details>;
}
