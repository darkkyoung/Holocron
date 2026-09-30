import {db,setting} from '@/lib/news';
import {DEFAULT_ROADMAP_COPY,ROADMAP_COPY_SETTING_KEY,normalizeRoadmapCopy,validateRoadmapCopy,type RoadmapCopy} from '@/lib/roadmap-copy';

export async function loadRoadmapCopy():Promise<RoadmapCopy>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(ROADMAP_COPY_SETTING_KEY).first<{value:string}>();
  if(!row?.value)return structuredClone(DEFAULT_ROADMAP_COPY);
  try{return normalizeRoadmapCopy(JSON.parse(row.value));}
  catch{return structuredClone(DEFAULT_ROADMAP_COPY);}
}

export async function saveRoadmapCopy(value:unknown):Promise<RoadmapCopy>{
  const copy=validateRoadmapCopy(value);
  await setting(ROADMAP_COPY_SETTING_KEY,JSON.stringify(copy));
  return copy;
}

export async function resetRoadmapCopy():Promise<RoadmapCopy>{
  await db().prepare('DELETE FROM settings WHERE key=?').bind(ROADMAP_COPY_SETTING_KEY).run();
  return structuredClone(DEFAULT_ROADMAP_COPY);
}
