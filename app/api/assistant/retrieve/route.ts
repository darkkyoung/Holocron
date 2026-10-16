import {db} from '@/lib/news';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
import {handleRetrieve} from '@/lib/assistant/http';
function handle(request:Request){return handleRetrieve(request,{...assistantRetrievalConfig(),database:db});}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
