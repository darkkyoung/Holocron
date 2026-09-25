import {getAdminSession} from '@/lib/admin/session';
import {TmdbImportError} from '@/lib/works/import/tmdb-client';
import {getTmdbSeasonPosters,getTmdbTvSeasons,previewTmdbImport} from '@/lib/works/import/service';

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {action?:unknown;id?:unknown;mediaType?:unknown;seasonNumber?:unknown};
    if(body.action==='seasons')return Response.json(await getTmdbTvSeasons(body.id));
    if(body.action==='posters')return Response.json({candidates:await getTmdbSeasonPosters(body.id,body.seasonNumber)});
    if(body.action==='preview')return Response.json(await previewTmdbImport(body.mediaType,body.id,body.seasonNumber));
    return Response.json({error:'TMDB 요청을 확인해 주세요.'},{status:400});
  }catch(error){const message=error instanceof TmdbImportError?error.message:(error as Error).message;return Response.json({error:message},{status:error instanceof TmdbImportError&&error.configuration?503:400});}
}
