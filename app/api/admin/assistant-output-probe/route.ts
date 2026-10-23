import {env} from 'cloudflare:workers';
import {getAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {createOutputLogger} from '@/lib/assistant/output-logger';
import {handleOutputLogProbe} from '@/lib/observability/output-log-probe';

function handle(request:Request){
  const config=env as unknown as Record<string,unknown>;
  return handleOutputLogProbe(request,{
    authorized:async()=>!!await getAdminSession(),database:db,
    enabled:config.HOLOCRON_ASSISTANT_ENABLED,window:config.HOLOCRON_ASSISTANT_OUTPUT_PROBE_WINDOW,
    createLogger:createOutputLogger,
  });
}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
