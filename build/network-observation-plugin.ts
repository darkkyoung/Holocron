import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

// Build-only observation hooks for the exact installed/patched Vinext. No
// node_modules mutation, dependency patch replacement, or request repair.
const targets={
  'app-router-entry.js':{hash:'6d72ba5bd3c5aa5772948fc6a37fc4da20129aa7f1e53d46c3b090d314fbd0cd',replacements:[
    ['return handleRequest(request, env, ctx);','__observeNetwork("B_ENTRY", request);\n\treturn handleRequest(request, env, ctx);'],
    ['request = cloneRequestWithHeaders(request, filteredHeaders);','request = cloneRequestWithHeaders(request, filteredHeaders);\n\t\t__observeNetwork("B_HEADERS", request);'],
  ]},
  'app-rsc-handler.js':{hash:'f6b80070d71aab8201ee7419520085be8f4694dba4d0f6dd42b8ef4acc4f97cf',replacements:[
    ['options.registerCacheAdapters();','__observeNetwork("B_RSC", rawRequest);\n\t\toptions.registerCacheAdapters();'],
    ['request: cloneRequestWithUrl(routeHandlerRequest, routeHandlerUrl),','request: __observedRequest("B_URL_AFTER", cloneRequestWithUrl(__observedRequest("B_URL_BEFORE", routeHandlerRequest), routeHandlerUrl)),'],
  ]},
  'app-route-handler-runtime.js':{hash:'49b934af537bd042baaa7424270765c881ba1ab4555b0d468a686d9dfddc0cad',replacements:[
    ['const nextRequest = requestWithOverrides instanceof NextRequest ? requestWithOverrides : new NextRequest(requestWithOverrides, { nextConfig: nextConfig ?? void 0 });',
      '__observeNetwork("B_NEXT_BEFORE", requestWithOverrides);\n\t\tconst nextRequest = requestWithOverrides instanceof NextRequest ? requestWithOverrides : new NextRequest(requestWithOverrides, { nextConfig: nextConfig ?? void 0 });\n\t\t__observeNetwork("B_NEXT_AFTER", nextRequest);'],
  ]},
};

export function instrumentNetworkBoundary(code:string,id:string,root:string):string|null{
  const name=id.replaceAll('\\','/').split('/').pop() as keyof typeof targets;
  if(!id.replaceAll('\\','/').includes('/vinext/dist/server/')||!Object.hasOwn(targets,name))return null;
  const target=targets[name];
  if(createHash('sha256').update(code).digest('hex')!==target.hash)throw new Error('NETWORK_OBSERVATION_VINEXT_INTEGRITY_FAILED');
  for(const [before,after] of target.replacements){
    if(code.split(before).length!==2)throw new Error('NETWORK_OBSERVATION_BOUNDARY_MISMATCH');
    code=code.replace(before,after);
  }
  return `import {observeNetwork as __observeNetwork, observedRequest as __observedRequest} from ${JSON.stringify(resolve(root,'lib/observability/assistant-network.ts'))};\n${code}`;
}

export function networkObservationPlugin():Plugin{
  let root=process.cwd();
  return {name:'holocron-network-observation',enforce:'pre',configResolved(config){root=config.root;},
    transform(code,id){const result=instrumentNetworkBoundary(code,id,root);return result===null?null:{code:result,map:null};}};
}
