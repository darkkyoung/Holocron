import {env} from 'cloudflare:workers';
import {anonymousSession,withAnonymousSession} from '@/lib/beta/anonymous-session';
import {parseFeedbackInput} from '@/lib/feedback/domain';
import {acquireFeedbackWindow,releaseFeedbackWindow} from '@/lib/feedback/repository';
import {deliverFeedback} from '@/lib/feedback/service';
import {ensureFeedbackUser,recordFeedbackDelivery} from '@/lib/feedback/users-repository';

export async function GET(){return Response.json({error:'Method Not Allowed'},{status:405,headers:{Allow:'POST'}});}

export async function POST(request:Request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'JSON 요청만 지원합니다.'},{status:415});
  let body:unknown;
  try{body=await request.json();}catch{return Response.json({error:'메모 형식을 확인해 주세요.'},{status:400});}
  let input;
  try{input=parseFeedbackInput(body);}catch(error){return Response.json({error:(error as Error).message},{status:400});}
  const webhookUrl=(env as unknown as Record<string,string|undefined>).HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL;
  if(!webhookUrl)return Response.json({error:'피드백 전달 기능이 아직 설정되지 않았습니다.'},{status:503});
  const session=await anonymousSession(request);
  const now=new Date();
  let user;
  try{user=await ensureFeedbackUser(session.sessionHash,input.nickname,now);}
  catch{return withAnonymousSession(Response.json({error:'피드백 사용자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503}),session.setCookie);}
  if(user.banned)return withAnonymousSession(Response.json({error:'현재 이 브라우저에서는 메모를 보낼 수 없습니다.'},{status:403}),session.setCookie);
  const window=await acquireFeedbackWindow(session.sessionHash,now);
  if(!window.acquired)return withAnonymousSession(Response.json({error:'잠시 후 다시 메모를 보내 주세요.'},{status:429}),session.setCookie);
  try{
    await deliverFeedback(input,{webhookUrl,fetcher:fetch,now:()=>new Date(),userTag:user.tag});
  }catch(error){
    await releaseFeedbackWindow(session.sessionHash,window.nextAllowedAt);
    return withAnonymousSession(Response.json({error:(error as Error).message},{status:502}),session.setCookie);
  }
  try{await recordFeedbackDelivery(session.sessionHash,input.nickname,new Date());}
  catch(error){console.error('Failed to record delivered feedback metadata',error);}
  return withAnonymousSession(Response.json({ok:true,tag:user.tag}),session.setCookie);
}
