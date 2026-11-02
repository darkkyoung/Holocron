import {useEffect,useRef,useState} from 'react';
import {defaultProfile,safeProfileImage,PROFILE_KEY,readProfiles,validateProfiles,type RacerProfile} from './racer-profiles';
import type {Racer} from '../../lib/racing/types';
import './racer-profiles.css';
export function useRacerProfiles(){
 const [state,setState]=useState(()=>{try{return readProfiles(localStorage);}catch{return {profiles:[] as RacerProfile[],error:'브라우저 저장소 접근이 차단되어 기본 정보를 표시합니다.'};}});
 function save(profiles:RacerProfile[]){const checked=validateProfiles(profiles);localStorage.setItem(PROFILE_KEY,JSON.stringify(checked));setState({profiles:checked,error:''});}
 return {...state,save};
}
function Portrait({profile,color}:{profile:RacerProfile;color:string}){
 const [failed,setFailed]=useState(false);
 // Static demo: direct HTTPS images are user-provided; no image proxy/server exists.
 // eslint-disable-next-line @next/next/no-img-element
 return profile.image&&!failed?<img className="profile-portrait" src={profile.image} alt={profile.name+' 프로필'} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:
  <div className="profile-portrait placeholder" style={{borderColor:color}} role="img" aria-label="프로필 이미지 준비 중"><span>◇</span><small>IMAGE PENDING</small></div>;
}
export function ProfileDialog({profile,color,close}:{profile:RacerProfile;color:string;close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,dialog=ref.current!;dialog.showModal();return()=>{dialog.close();previous?.focus();};},[]);
 return <dialog className="profile-dialog" ref={ref} aria-labelledby="racer-profile-name" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <article><header><small>RACER PROFILE · LOCAL DEMO</small><button onClick={close} aria-label="선수 정보 닫기">×</button></header>
   <Portrait key={profile.image} profile={profile} color={color}/><h2 id="racer-profile-name">{profile.name}</h2>
   <dl>{([['birth','출생일'],['species','종족'],['home','고향'],['affiliation','소속']] as const).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{profile[key]||'정보 준비 중'}</dd></div>)}</dl>
   <p className="profile-description">{profile.description||'선수 소개를 준비 중입니다.'}</p><small>프로필은 주행 능력치·경기 결과에 영향을 주지 않습니다.</small>
  </article>
 </dialog>;
}
export function ProfileAdmin({racers,profiles,save,error}:{racers:readonly Racer[];profiles:RacerProfile[];save:(p:RacerProfile[])=>void;error:string}){
 const [selected,setSelected]=useState(racers[0].id),[draft,setDraft]=useState(()=>profiles.find(p=>p.id===racers[0].id)??defaultProfile(racers[0].id,racers[0].name));
 const [message,setMessage]=useState(''),[problem,setProblem]=useState('');
 const options=[...racers.map(r=>({id:r.id,name:r.name})),...profiles.filter(p=>!racers.some(r=>r.id===p.id))];
 function select(id:string){setSelected(id);setDraft(profiles.find(p=>p.id===id)??defaultProfile(id,racers.find(r=>r.id===id)?.name??''));setMessage('');setProblem('');}
 function commit(){try{save([...profiles.filter(p=>p.id!==draft.id),draft]);setMessage('이 브라우저에 저장했습니다.');setProblem('');}catch(e){setProblem(e instanceof Error?e.message:'로컬 저장 실패');}}
 async function importFile(file:File|undefined){if(!file)return;try{if(file.size>1000000)throw Error('JSON 파일은 1MB 이하여야 합니다.');const values=validateProfiles(JSON.parse(await file.text()));save(values);setDraft(values.find(p=>p.id===selected)??defaultProfile(selected,racers.find(r=>r.id===selected)?.name??selected));setMessage('프로필 JSON을 가져왔습니다.');setProblem('');}catch(e){setProblem(e instanceof Error?e.message:'가져오기 실패');}}
 function exportFile(){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(profiles,null,2)],{type:'application/json'}));link.href=url;link.download='holocron-local-racer-profiles.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <details className="profile-admin"><summary>LOCAL DEMO ADMIN · 선수 프로필 편집</summary><p>이 브라우저에만 저장합니다. 운영 관리자 인증·DB와 연결되지 않습니다. 외부 이미지는 입력한 HTTPS 주소에서 불러옵니다.</p>
  {error&&<p role="alert">{error}</p>}<label>선수 프로필<select aria-label="편집할 선수 프로필" value={selected} onChange={e=>select(e.target.value)}>{options.map(r=><option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select></label>
  <div className="profile-fields">{([['name','이름',80],['image','이미지 URL',2048],['birth','출생일',80],['species','종족',80],['home','고향',120],['affiliation','소속',120]] as const).map(([key,label,max])=><label key={key}>{label}<input aria-label={'프로필 '+label} value={draft[key]} maxLength={max} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
  <label className="profile-desc-field">설명<textarea aria-label="프로필 설명" maxLength={1600} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label></div>
  <div className="profile-preview"><Portrait key={draft.image} profile={{...draft,image:safeProfileImage(draft.image)}} color={racers.find(r=>r.id===draft.id)?.color??'#ffda4b'}/><span>이미지 미리보기 · 로드 실패 시 대체 표시</span></div>
  <div className="profile-actions"><button onClick={commit}>프로필 저장</button><button onClick={exportFile}>JSON 내보내기</button><label>JSON 가져오기<input aria-label="프로필 JSON 가져오기" type="file" accept="application/json,.json" onChange={e=>void importFile(e.target.files?.[0])}/></label></div>
  {problem&&<p role="alert">{problem}</p>}{message&&<p role="status">{message}</p>}
 </details>;
}
