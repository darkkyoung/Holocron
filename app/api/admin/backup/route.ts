import {getAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {exportBackup,BackupExportError} from '@/lib/backup/export';
import {backupFilename} from '@/lib/backup/format';
import {serializeBackup,BackupValidationError} from '@/lib/backup/validator';

const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
export async function POST(request:Request){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401,headers:privateHeaders});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403,headers:privateHeaders});
  try{
    const backup=await exportBackup(db());
    return new Response(serializeBackup(backup),{headers:{...privateHeaders,'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${backupFilename(backup.createdAt)}"`}});
  }catch(error){
    const message=error instanceof BackupExportError?error.message:error instanceof BackupValidationError?'백업 데이터 검증에 실패했습니다. 관계 무결성을 확인해 주세요.':'백업을 생성하지 못했습니다. 다시 시도해 주세요.';
    return Response.json({error:message},{status:500,headers:privateHeaders});
  }
}
