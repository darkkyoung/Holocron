/** One permanent, content-free tombstone for this probe. Never reset/rearm it
 * from an HTTP request, a different observation window, or an isolate restart. */
export const OUTPUT_LOG_PROBE_KEY='assistant_output_log_probe_v1';
export async function consumeOutputLogProbe(db:D1Database,window:{start:number;end:number},now:number){
  const value=JSON.stringify({schemaVersion:1,state:'consumed',windowStart:window.start,windowEnd:window.end,consumedAt:now});
  // Primary-key conflict arbitrates across isolates. The visibility predicate
  // also prevents a PUBLIC transition between the validated read and write.
  // No read-then-insert race, update, cleanup, replacement or retry.
  const row=await db.prepare(`INSERT INTO settings(key,value)
    SELECT ?,? WHERE EXISTS (SELECT 1 FROM settings WHERE key='site_visibility_v1'
      AND CASE WHEN json_valid(value) THEN json_extract(value,'$.mode')='MAINTENANCE' ELSE 0 END)
    ON CONFLICT(key) DO NOTHING RETURNING key`).bind(OUTPUT_LOG_PROBE_KEY,value).first<{key:string}>();
  return row?.key===OUTPUT_LOG_PROBE_KEY;
}
