import {groupWorksByStatus,isWorkStatus,type WorkStatus} from './types';
import {createWork,deleteWork,findWorkByTmdbReference,listWorks,updateWork,updateWorkStatus} from './repository';
import {validateWorkDraft} from './validation';

export async function getWorksArchive(){return {sections:groupWorksByStatus(await listWorks())};}
export async function getWorksManagementState(){return getWorksArchive();}
export async function getManagedWorks(){return listWorks();}
export async function changeWorkStatus(id:unknown,status:unknown){
  if(typeof id!=='string'||!id)throw new Error('작품을 확인해 주세요.');
  if(!isWorkStatus(status))throw new Error('작품 상태를 확인해 주세요.');
  await updateWorkStatus(id,status);
  return {ok:true,status:status as WorkStatus};
}

function workId(value:unknown){if(typeof value!=='string'||!value)throw new Error('작품을 확인해 주세요.');return value;}
async function ensureUniqueTmdbReference(draft:ReturnType<typeof validateWorkDraft>,currentId?:string){
  if(!draft.tmdbMediaType||!draft.tmdbId)return;
  const existing=await findWorkByTmdbReference(draft.tmdbMediaType,draft.tmdbId,draft.tmdbSeasonNumber??null);
  if(existing&&existing.id!==currentId)throw new Error('같은 TMDB 작품이 이미 HOLOCRON에 등록되어 있습니다.');
}
export async function createManagedWork(input:unknown){const draft=validateWorkDraft(input);await ensureUniqueTmdbReference(draft);return createWork(crypto.randomUUID(),draft);}
export async function updateManagedWork(id:unknown,input:unknown){const work=workId(id);const draft=validateWorkDraft(input);await ensureUniqueTmdbReference(draft,work);return updateWork(work,draft);}
export async function deleteManagedWork(id:unknown){await deleteWork(workId(id));return {ok:true};}
