import {groupWorksByStatus,isWorkStatus,type WorkStatus} from './types';
import {listWorks,updateWorkStatus} from './repository';

export async function getWorksArchive(){return {sections:groupWorksByStatus(await listWorks())};}
export async function getWorksManagementState(){return getWorksArchive();}
export async function changeWorkStatus(id:unknown,status:unknown){
  if(typeof id!=='string'||!id)throw new Error('작품을 확인해 주세요.');
  if(!isWorkStatus(status))throw new Error('작품 상태를 확인해 주세요.');
  await updateWorkStatus(id,status);
  return {ok:true,status:status as WorkStatus};
}
