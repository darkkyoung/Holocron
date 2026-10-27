import {unicodeLength} from './types';
import {invalidOutput} from './output-diagnostic';
/** This deliberately small schema subset is both sent to Responses and checked locally.
 * All object keys required; no defaults, coercion, stripped unknown keys or repair. */
type Schema={type:'string';maxLength:number;minLength?:number;enum?:readonly string[]}|{type:'array';items:Schema;maxItems:number}|{type:'object';properties:Record<string,Schema>;required:string[];additionalProperties:false};
const string=(maxLength:number,minLength=1):Schema=>({type:'string',minLength,maxLength});
const enumeration=(values:string[]):Schema=>({type:'string',maxLength:40,enum:values});
const array=(items:Schema,maxItems:number):Schema=>({type:'array',items,maxItems});
const object=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const ids=array(string(200),24);
const status=enumeration(['ok','insufficient_evidence']);
// Whole-answer references, not fabricated sentence-level proof. Links stay server-owned.
export const QA_SCHEMA=object({status,answer:string(2400),evidenceIds:ids,limitations:array(string(240),4)});
export const SCRIPT_SCHEMA=object({status,titles:array(string(120),3),direction:string(400),
  recommendations:array(object({evidenceId:string(200),reason:string(240),keyPoints:array(string(240),4)}),8),
  sections:array(object({heading:string(120),purpose:string(240),points:array(string(280),4),evidenceIds:ids,transition:string(240)}),5),
  limitations:array(string(240),4)});
export const outputSchema=(mode:'qa'|'script')=>mode==='qa'?QA_SCHEMA:SCRIPT_SCHEMA;
export function validateShape(value:unknown,schema:Schema,path='$'):void{
  if(schema.type==='string'){
    if(typeof value!=='string')invalidOutput('SCHEMA_TYPE',path);
    const text=value as string;
    if(unicodeLength(text)>schema.maxLength||unicodeLength(text.trim())<(schema.minLength??0))invalidOutput('STRING_LENGTH',path);
    if(schema.enum&&!schema.enum.includes(text))invalidOutput('STRING_ENUM',path);
  }else if(schema.type==='array'){
    if(!Array.isArray(value))invalidOutput('SCHEMA_TYPE',path);
    const items=value as unknown[];
    if(items.length>schema.maxItems)invalidOutput('ARRAY_LENGTH',path);
    for(const [index,item] of items.entries())validateShape(item,schema.items,`${path}[${index}]`);
  }else{
    if(!value||typeof value!=='object'||Array.isArray(value))invalidOutput('SCHEMA_TYPE',path);
    if(Object.keys(value as object).sort().join(',')!==[...schema.required].sort().join(','))invalidOutput('OBJECT_KEYS',path);
    for(const [key,child] of Object.entries(schema.properties))validateShape((value as Record<string,unknown>)[key],child,`${path}.${key}`);
  }
}
export type QaOutput={status:'ok'|'insufficient_evidence';answer:string;evidenceIds:string[];limitations:string[]};
export type ScriptOutput={status:'ok'|'insufficient_evidence';titles:string[];direction:string;
  recommendations:{evidenceId:string;reason:string;keyPoints:string[]}[];
  sections:{heading:string;purpose:string;points:string[];evidenceIds:string[];transition:string}[];limitations:string[]};
