import {groupWorksByStatus,isWorkStatus,type WorkStatus} from './types';
import {createWork,deleteWork,listWorks,updateWork,updateWorkStatus} from './repository';
import {validateWorkDraft} from './validation';

export async function getWorksArchive(){return {sections:groupWorksByStatus(await listWorks())};}
export async function getWorksManagementState(){return getWorksArchive();}
export async function changeWorkStatus(id:unknown,status:unknown){
  if(typeof id!=='string'||!id)throw new Error('작품을 확인해 주세요.');
  if(!isWorkStatus(status))throw new Error('작품 상태를 확인해 주세요.');
  await updateWorkStatus(id,status);
  return {ok:true,status:status as WorkStatus};
}

function workId(value:unknown){if(typeof value!=='string'||!value)throw new Error('작품을 확인해 주세요.');return value;}
export async function createManagedWork(input:unknown){return createWork(crypto.randomUUID(),validateWorkDraft(input));}
export async function updateManagedWork(id:unknown,input:unknown){return updateWork(workId(id),validateWorkDraft(input));}
export async function deleteManagedWork(id:unknown){await deleteWork(workId(id));return {ok:true};}
