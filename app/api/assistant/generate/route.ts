import {env} from 'cloudflare:workers';
import {AssistantError} from '@/lib/assistant/types';
import {assistantErrorResponse} from '@/lib/assistant/http';
import {db} from '@/lib/news';
import {assistantGenerationConfig} from '@/lib/assistant/generation-config';
import {handleGenerate} from '@/lib/assistant/generate-http';
import {createOutputLogger} from '@/lib/assistant/output-logger';
import {getAdminSession} from '@/lib/admin/session';
import {withAdminOutputDiagnostic} from '@/lib/assistant/admin-output-diagnostic';
function handle(request:Request){
  // Free-MVP release: legacy paid routes must not charge Credit through direct API calls.
  if((env as unknown as Record<string,string|undefined>).HOLOCRON_ASSISTANT_FREE_MVP_ENABLED==='true')
    return assistantErrorResponse(new AssistantError('ASSISTANT_UNAVAILABLE',503));
  return withAdminOutputDiagnostic(
    observer=>handleGenerate(request,{...assistantGenerationConfig(),database:db,onOutputDiagnostic:observer}),
    async()=>!!await getAdminSession(),
    createOutputLogger(),
  );
}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
