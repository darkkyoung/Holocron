import {env} from 'cloudflare:workers';
import {authorizeScheduler} from '@/lib/collection/scheduler-auth';
import {runCollection} from '@/lib/collection/run';

export const dynamic='force-dynamic';

export async function GET(){return Response.json({error:'Method Not Allowed'},{status:405,headers:{Allow:'POST'}});}

export async function POST(request:Request){
  const secret=(env as unknown as Record<string,string|undefined>).HOLOCRON_SCHEDULER_SECRET;
  const authorization=authorizeScheduler(request.headers.get('authorization'),secret);
  if(authorization==='unconfigured')return Response.json({error:'스케줄러 구성이 완료되지 않았습니다.'},{status:503});
  if(authorization!=='authorized')return Response.json({error:'Unauthorized'},{status:401});
  try{
    const result=await runCollection('scheduled');
    return Response.json({ok:true,status:result.status,reason:result.reason,count:result.count,startedAt:result.startedAt,finishedAt:result.finishedAt});
  }catch{return Response.json({error:'수집 실행에 실패했습니다.'},{status:500});}
}
