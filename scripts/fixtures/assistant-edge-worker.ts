// Test-only Worker: actual pinned Vinext dispatch + actual Assistant HTTP/D1.
import {createAppRscHandler} from '../../node_modules/vinext/dist/server/app-rsc-handler.js';
import {NextRequest} from 'vinext/shims/server';
import {handleRetrieve} from '../../lib/assistant/http';
import {handleGenerate} from '../../lib/assistant/generate-http';
import {trustedEdgeNetwork} from '../../lib/assistant/abuse-identity';
import {ASSISTANT_PROFILE} from '../../lib/assistant/provider-profile';
const now=Date.parse('2026-10-21T08:00:00Z');
const secrets={secret:'synthetic-edge-receipt-secret-32-bytes',abuseSecret:'synthetic-edge-abuse-secret-32-bytes',identitySecrets:{account:'synthetic-edge-account-secret-32-bytes',guest:'synthetic-edge-guest-secret-32-bytes'}};
let calls=0;
const worker={async fetch(original:Request,env:{DB:D1Database},ctx:ExecutionContext){
 // Only this isolated fixture can simulate a platform without trusted metadata.
 let input=original.headers.get('test-no-cf')==='1'?new Request(original.url,{method:original.method,headers:original.headers,body:original.body,cf:{},duplex:'half'} as RequestInit):original;
 if(original.headers.has('test-ip')){input=new Request(original);Object.defineProperty(input,'cf',{value:(original as Request&{cf?:unknown}).cf});if(original.headers.get('test-ip')==='missing')input.headers.delete('CF-Connecting-IP');else input.headers.set('CF-Connecting-IP',original.headers.get('test-ip')!);}
 const handler=createAppRscHandler({basePath:'',buildId:'edge-test',clearRequestContext(){},registerCacheAdapters(){},setNavigationContext(){},configHeaders:[],configRedirects:[],configRewrites:{beforeFiles:[],afterFiles:[],fallback:[]},draftModeSecret:'synthetic-only',i18nConfig:null,isDev:false,publicFiles:new Set(),staticParamsMap:{},trailingSlash:false,
  matchRoute:pathname=>({params:{},route:{pattern:pathname,isDynamic:false,routeSegments:[],routeHandler:{}}}),
  renderNotFound:async()=>new Response(null,{status:404}),dispatchMatchedPage:async()=>new Response(null,{status:404}),
  dispatchMatchedRouteHandler:async({request})=>{
   const r=new NextRequest(request),path=new URL(r.url).pathname;
   if(path==='/probe')return Response.json({trusted:!!trustedEdgeNetwork(r),colo:!!(r as Request&{cf?:{colo?:string}}).cf?.colo});
   const deps={...secrets,database:()=>env.DB,enabled:r.headers.get('test-off')!=='1',now:()=>now,profileId:ASSISTANT_PROFILE,apiKey:'synthetic-never-live',fetcher:async(_url:unknown,init:RequestInit)=>{
    calls++;const sent=JSON.parse(String(init.body)),a=JSON.parse(sent.input[0].content[0].text).evidence[0];
    const fact={text:a.title,evidenceIds:[a.evidenceId],certainty:'attributed_report',supports:[{evidenceId:a.evidenceId,field:'title',span:a.title}]};
    const output={status:'ok',answer:[fact],limitations:[]};
    return Response.json({status:'completed',model:'gpt-5.4-mini-2026-03-17',error:null,incomplete_details:null,usage:{input_tokens:500,output_tokens:100},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(output),annotations:[]}]}]});
   }};
   const response=path==='/retrieve'?await handleRetrieve(r,deps):await handleGenerate(r,deps);
   response.headers.set('test-mock-calls',String(calls));return response;
  }});
 return handler(input,ctx);
}};

export default worker;
