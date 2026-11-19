// Public application capability: only a private snapshot-service binding.
// No client credentials, debug headers, caller clock or host go to the reader.
export interface SnapshotReader {fetch(request:Request):Promise<Response>}
export const policy={'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function gateway(req:Request,reader?:SnapshotReader){
 if(req.method!=='GET'||req.headers.has('upgrade'))return Response.json({error:'UNSUPPORTED'},{status:405,headers:policy});
 if(!reader)return Response.json({phase:'UNAVAILABLE'},{status:503,headers:policy});
 try{const safe=new URL('https://snapshot.internal/watch');safe.search=new URL(req.url).search;
  const response=await reader.fetch(new Request(safe));
  if(response.status>=500||response.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('UNAVAILABLE');
  return new Response(response.body,{status:response.status,headers:{...policy,'Content-Type':'application/json'}});
 }catch{return Response.json({phase:'WAITING'},{status:503,headers:policy});}
}
