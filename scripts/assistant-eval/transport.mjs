import {MODEL,fail} from './budget.mjs';
export const ENDPOINT='https://api.openai.com/v1/responses';
export function checkWire(url,init,profile){
  const b=JSON.parse(init.body);
  if(url!==ENDPOINT||init.method!=='POST'||init.redirect!=='manual'||b.model!==MODEL||b.store!==false||b.stream!==false||b.background!==false||b.service_tier!=='default'||b.reasoning?.effort!=='none'||b.tools?.length!==0||b.tool_choice!=='none'||b.truncation!=='disabled'||b.max_output_tokens!==profile.cost.maxOutputTokens||!b.text?.format?.strict||b.previous_response_id||b.conversation)fail('PROVIDER_CONTRACT_MISMATCH');
  return b;
}
export function mockResponse(body,scenario){
  const data=JSON.parse(body.input[0].content[0].text),a=data.evidence[0];
  if(!a)fail('NO_MOCK_EVIDENCE');
  // A transport contract double, never a model quality score. Exact excerpt + caveat.
  const sourceText=a.summary||a.title;
  const text=sourceText.replace(/공식(?:적으로)?\s*(?:발표|확정|확인)/gu,'보도').replace(/https?:\/\/\S+/gu,'외부 주소').replace(/[<>]/g,'')+' (선택한 보도 범위이며 추가 사실은 확인되지 않았습니다.)';
  const supports=[];for(let i=0;i<sourceText.length;i+=140)supports.push({evidenceId:a.evidenceId,field:a.summary?'summary':'title',span:sourceText.slice(i,i+140)});
  const f={text,evidenceIds:[a.evidenceId],certainty:'attributed_report',supports};
  const insufficient=scenario==='thin';
  const result=body.text.format.name==='archive_qa'?{status:insufficient?'insufficient_evidence':'ok',answer:insufficient?[]:[f],limitations:['선택된 제목·요약만 사용하며 추가 세부 정보는 확인할 수 없습니다.']}:
    {status:'ok',facts:[{factId:'f1',...f}],caveats:[],outline:[{heading:'소식 소개',factIds:['f1'],creativeNote:'창작 연결'}],draft:data.includeDraft?[{kind:'fact',text:f.text,factIds:['f1']},{kind:'creative',text:'여러분은 어떻게 생각하시나요?',factIds:[]}]:[]};
  return Response.json({status:'completed',model:MODEL,error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(result),annotations:[]}]}]});
}
