import {env} from 'cloudflare:workers';
import {authorizeScheduler} from '@/lib/collection/scheduler-auth';
import {runCollection} from '@/lib/collection/run';
import {markScheduledCollectionCompleted,scheduledCollectionGate} from '@/lib/collection/schedule-settings-repository';

export const dynamic='force-dynamic';

export async function GET(){return Response.json({error:'Method Not Allowed'},{status:405,headers:{Allow:'POST'}});}

export async function POST(request:Request){
  const secret=(env as unknown as Record<string,string|undefined>).HOLOCRON_SCHEDULER_SECRET;
  const authorization=authorizeScheduler(request.headers.get('authorization'),secret);
  if(authorization==='unconfigured')return Response.json({error:'스케줄러 구성이 완료되지 않았습니다.'},{status:503});
  if(authorization!=='authorized')return Response.json({error:'Unauthorized'},{status:401});
  try{
    const checkedAt=new Date();
    const gate=await scheduledCollectionGate(checkedAt);
    if(!gate.due){
      const at=checkedAt.toISOString();
      return Response.json({ok:true,status:'skipped',reason:'schedule_interval_not_elapsed',count:0,startedAt:at,finishedAt:at,intervalHours:gate.intervalHours,nextDueAt:gate.nextDueAt});
    }
    const result=await runCollection('scheduled');
    if((result.status==='success'||result.status==='partial')&&result.finishedAt)await markScheduledCollectionCompleted(result.finishedAt);
    return Response.json({ok:true,status:result.status,reason:result.reason,count:result.count,startedAt:result.startedAt,finishedAt:result.finishedAt,intervalHours:gate.intervalHours});
  }catch{return Response.json({error:'수집 실행에 실패했습니다.'},{status:500});}
}
