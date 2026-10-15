import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),workerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=workerRequire('miniflare'),{build}=workerRequire('esbuild');
const config={clientId:'runtime-fixture',clientSecret:'synthetic-secret',sessionSecret:'synthetic-session-secret-at-least-32-bytes'};
const now=new Date('2026-10-15T12:00:00Z');
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'runtime-key',alg:'RS256',use:'sig'};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const unsigned=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:'https://accounts.google.com',aud:config.clientId,sub:'runtime-subject',nonce:'runtime-nonce',iat:now.getTime()/1000,exp:now.getTime()/1000+3600});
const token=unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
const bundled=await build({stdin:{contents:`import {exchangeGoogleCode} from './lib/identity/google/protocol.ts';
export default {async fetch(){try{return Response.json({subject:await exchangeGoogleCode('synthetic-code','synthetic-verifier','runtime-nonce',${JSON.stringify(config)},new Date('${now.toISOString()}'))});}catch(e){return Response.json({stage:e.stage});}}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
let mode='success',requests=[];
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:bundled.outputFiles[0].text,outboundService:async request=>{
  requests.push(request.url);
  if(request.url==='https://oauth2.googleapis.com/token'){
    assert.equal(request.method,'POST');
    const form=new URLSearchParams(await request.text());assert.equal(form.get('client_secret'),config.clientSecret);assert.equal(form.get('redirect_uri'),'https://holocron.kr/api/auth/google/callback');
    if(mode==='token_redirect')return new Response(null,{status:307,headers:{Location:'https://untrusted.invalid/token'}});
    if(mode==='invalid_client')return Response.json({error:'invalid_client',error_description:'DO-NOT-LOG',access_token:'DO-NOT-LOG'},{status:401});
    return Response.json({id_token:token});
  }
  if(request.url==='https://www.googleapis.com/oauth2/v3/certs'){
    if(mode==='jwks_redirect')return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/keys'}});
    return Response.json({keys:[jwk]});
  }
  throw new Error('Unexpected outbound destination');
}});
try{
  for(const [scenario,expected,count] of [['success',{subject:'runtime-subject'},2],['token_redirect',{stage:'token_response'},1],['jwks_redirect',{stage:'id_token_verification'},2],['invalid_client',{stage:'token_invalid_client'},1]]){
    mode=scenario;requests=[];
    assert.deepEqual(await (await mf.dispatchFetch('https://local.test/')).json(),expected,scenario);
    assert.equal(requests.length,count);assert(requests.every(url=>!url.includes('untrusted.invalid')));
  }
  console.log('Google Workers runtime: real fetch + RS256 success; token/JWKS redirects never followed; fixed OAuth error classification PASS');
}finally{await mf.dispose();}
