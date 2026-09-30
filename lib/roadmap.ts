import {DEFAULT_ROADMAP_COPY,ROADMAP_STAGE_IDS,type RoadmapStageId} from './roadmap-copy';

export type RoadmapStage={id:RoadmapStageId;marker:string;label:string;title:string;note:string;items:{title:string;description:string}[]};

// Stage order and item counts are fixed in code; only the copy is editable.
export const ROADMAP_STAGES:RoadmapStage[]=ROADMAP_STAGE_IDS.map(id=>({id,...DEFAULT_ROADMAP_COPY.stages[id]}));
