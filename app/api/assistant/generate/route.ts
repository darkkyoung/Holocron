import {db} from '@/lib/news';
import {assistantGenerationConfig} from '@/lib/assistant/generation-config';
import {handleGenerate} from '@/lib/assistant/generate-http';
import {createOutputLogger} from '@/lib/assistant/output-logger';
function handle(request:Request){return handleGenerate(request,{...assistantGenerationConfig(),database:db,onOutputDiagnostic:createOutputLogger()});}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
