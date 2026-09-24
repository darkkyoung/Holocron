import {getAdminSession} from '@/lib/admin/session';
import {TmdbImportError} from '@/lib/works/import/tmdb-client';
import {searchTmdbWorks} from '@/lib/works/import/service';

export async function GET(request:Request){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  try{return Response.json({results:await searchTmdbWorks(new URL(request.url).searchParams.get('query'))});}
  catch(error){const message=error instanceof TmdbImportError?error.message:(error as Error).message;return Response.json({error:message},{status:error instanceof TmdbImportError&&error.configuration?503:400});}
}
