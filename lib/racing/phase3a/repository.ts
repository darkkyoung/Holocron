import type {RaceState,Stage} from './domain';
export interface RaceRow {id:string;season_id:string;round_no:number;qualifying_at:number;starts_at:number;state:RaceState;revision:number;finish_at:number|null;final_at:number|null}
export interface GenerationRow {race_id:string;stage:Stage;input_hash:string;commitment:string;secret_cipher:string;entropy_ref:string;state:string;owner:string|null;lease_until:number|null;attempt:number;output_hash:string|null;output_ref:string|null;entropy_hash:string|null;candidate_hash:string|null}
export interface SeasonRow {id:string;manifest:string;input_hash:string}
export class RacingRepository {
 constructor(readonly db:D1Database){}
 statement(sql:string,...values:(string|number|null)[]){return this.db.prepare(sql).bind(...values);}
 race(id:string){return this.statement('SELECT * FROM racing_races WHERE id=?',id).first<RaceRow>();}
 season(id:string){return this.statement('SELECT * FROM racing_seasons WHERE id=?',id).first<SeasonRow>();}
 generation(id:string,stage:Stage){return this.statement('SELECT * FROM racing_generations WHERE race_id=? AND stage=?',id,stage).first<GenerationRow>();}
 audit(id:string|null,actor:string,command:string,now:number,detail:string){return this.statement('INSERT INTO racing_audit(race_id,actor,command,at,detail) VALUES(?,?,?,?,?)',id,actor,command,now,detail);}
 guard(condition:string,...args:(string|number|null)[]){return this.statement(`INSERT OR REPLACE INTO racing_atomic_guard(id,ok) SELECT 1,CASE WHEN ${condition} THEN 1 ELSE 0 END`,...args);}
 async claim(id:string,stage:Stage,owner:string,now:number){
  const update=this.statement(`UPDATE racing_generations SET state='GENERATING',owner=?,lease_until=?,attempt=attempt+1 WHERE race_id=? AND stage=? AND (state IN ('SEALED','FAILED') OR (state='GENERATING' AND lease_until<=?)) AND EXISTS(SELECT 1 FROM racing_races WHERE id=? AND state IN ('SEALED','GENERATING'))`,owner,now+120000,id,stage,now,id);
  const results=await this.db.batch([update,this.statement("INSERT INTO racing_audit(race_id,actor,command,at,detail) SELECT ?,'generator','claim',?,? WHERE changes()=1",id,now,stage)]);
  return results[0].meta.changes===1;
 }
 async transition(row:RaceRow,state:RaceState,actor:string,now:number){
  await this.db.batch(this.transitionStatements(row,state,actor,now));
 }
 transitionStatements(row:RaceRow,state:RaceState,actor:string,now:number){
  return [
   this.statement('UPDATE racing_races SET state=?,revision=revision+1 WHERE id=? AND revision=? AND state=?',state,row.id,row.revision,row.state),
   this.guard('changes()=1'),this.audit(row.id,actor,'transition',now,state),
  ];
 }
}
