import {AssistantError,unicodeLength} from './types';
/** This deliberately small schema subset is both sent to Responses and checked locally.
 * All object keys required; no defaults, coercion, stripped unknown keys or repair. */
type Schema={type:'string';maxLength:number;minLength?:number;enum?:readonly string[]}|{type:'array';items:Schema;maxItems:number}|{type:'object';properties:Record<string,Schema>;required:string[];additionalProperties:false};
const string=(maxLength:number,minLength=1):Schema=>({type:'string',minLength,maxLength});
const enumeration=(values:string[]):Schema=>({type:'string',maxLength:40,enum:values});
const array=(items:Schema,maxItems:number):Schema=>({type:'array',items,maxItems});
const object=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const ids=array(string(200),24),factIds=array(string(40),16);
const fact={text:string(600),evidenceIds:ids,certainty:enumeration(['explicit_announcement','attributed_report','explicit_speculation','unclear']),supports:array(object({evidenceId:string(200),field:enumeration(['title','summary']),span:string(160)}),24)};
const status=enumeration(['ok','insufficient_evidence']);
export const QA_SCHEMA=object({status,answer:array(object(fact),8),limitations:array(string(240),5)});
// Script insufficiency uses one bounded caveat with no IDs; all generation arrays empty.
export const SCRIPT_SCHEMA=object({status,facts:array(object({factId:string(40),...fact}),16),caveats:array(object({text:string(300),evidenceIds:ids}),8),outline:array(object({heading:string(120),factIds,creativeNote:string(240,0)}),6),draft:array(object({kind:enumeration(['fact','creative']),text:string(800),factIds}),12)});
export const outputSchema=(mode:'qa'|'script')=>mode==='qa'?QA_SCHEMA:SCRIPT_SCHEMA;
export function validateShape(value:unknown,schema:Schema):void{
  const invalid=()=>{throw new AssistantError('INVALID_OUTPUT',502);};
  if(schema.type==='string'){
    if(typeof value!=='string'||unicodeLength(value)>schema.maxLength||unicodeLength(value.trim())<(schema.minLength??0)||(schema.enum&&!schema.enum.includes(value)))invalid();
  }else if(schema.type==='array'){
    if(!Array.isArray(value)||value.length>schema.maxItems)invalid();
    for(const item of value as unknown[])validateShape(item,schema.items);
  }else{
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...schema.required].sort().join(','))invalid();
    for(const [key,child] of Object.entries(schema.properties))validateShape((value as Record<string,unknown>)[key],child);
  }
}
export type Support={evidenceId:string;field:'title'|'summary';span:string};
export type Fact={text:string;evidenceIds:string[];certainty:'explicit_announcement'|'attributed_report'|'explicit_speculation'|'unclear';supports:Support[]};
export type QaOutput={status:'ok'|'insufficient_evidence';answer:Fact[];limitations:string[]};
export type ScriptOutput={status:'ok'|'insufficient_evidence';facts:(Fact&{factId:string})[];caveats:{text:string;evidenceIds:string[]}[];outline:{heading:string;factIds:string[];creativeNote:string}[];draft:{kind:'fact'|'creative';text:string;factIds:string[]}[]};
