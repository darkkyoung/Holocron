import type {FeedbackInput} from './domain';

const DISCORD_HOSTS=new Set(['discord.com','discordapp.com']);
const WEBHOOK_TIMEOUT_MS=8_000;

export type FeedbackDeliveryDependencies={webhookUrl:string|undefined;fetcher:typeof fetch;now:()=>Date;userTag:string};

function validatedWebhook(value:string|undefined){
  if(!value?.trim())throw new Error('피드백 전달 기능이 아직 설정되지 않았습니다.');
  let url:URL;
  try{url=new URL(value);}catch{throw new Error('피드백 전달 기능 설정을 확인해 주세요.');}
  if(url.protocol!=='https:'||!DISCORD_HOSTS.has(url.hostname)||!url.pathname.startsWith('/api/webhooks/'))throw new Error('피드백 전달 기능 설정을 확인해 주세요.');
  return url.toString();
}

export async function deliverFeedback(input:FeedbackInput,deps:FeedbackDeliveryDependencies){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),WEBHOOK_TIMEOUT_MS);
  try{
    const response=await deps.fetcher(validatedWebhook(deps.webhookUrl),{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({
        username:'HOLOCRON Beta Feedback',
        allowed_mentions:{parse:[]},
        embeds:[{title:'HOLOCRON Beta Feedback',description:input.message,color:16770589,fields:[
          {name:'유튜브 닉네임',value:input.nickname,inline:true},
          {name:'사용자 태그',value:deps.userTag,inline:true},
          {name:'페이지',value:input.page==='news'?'News Archive (/)':'Works Archive (/works)',inline:true},
          {name:'제출 시각',value:deps.now().toISOString(),inline:true},
        ]}],
      }),
    });
    if(!response.ok)throw new Error('메모를 전달하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }catch(error){
    if(error instanceof Error&&error.name==='AbortError')throw new Error('메모 전달 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    throw error;
  }finally{clearTimeout(timeout);}
}
