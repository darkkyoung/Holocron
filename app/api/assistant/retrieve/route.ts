import {AssistantError} from '@/lib/assistant/types';
import {assistantErrorResponse} from '@/lib/assistant/http';

// Release candidate deliberately exposes only /api/assistant/free.
// These legacy paid endpoints are disabled in every configuration, including
// accidental AI=ON / FREE_MVP=OFF. Their domain implementations are preserved.
function handle(_request:Request){
  void _request;
  return assistantErrorResponse(new AssistantError('ASSISTANT_UNAVAILABLE',503));
}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
