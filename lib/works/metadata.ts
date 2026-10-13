export type WorkMetadata={creatorCredit?:string|null;principalCast?:string[]|null;synopsis?:string|null;releaseContext?:string|null};

function optionalText(value:unknown,limit:number,label:string){
  if(value===null)return null;
  if(typeof value!=='string')throw new Error(`${label} 형식을 확인해 주세요.`);
  const result=value.trim();
  if(result.length>limit)throw new Error(`${label}은 ${limit}자 이내로 입력해 주세요.`);
  return result||null;
}

export function parsePrincipalCast(value:unknown):string[]|null{
  if(value===null)return null;
  if(typeof value==='string'){
    if(value.length>4096)throw new Error('출연진 입력이 너무 깁니다.');
    const raw=value.trim();
    if(!raw)return null;
    if(/^[\[{]/.test(raw)){
      try{value=JSON.parse(raw);}catch{throw new Error('출연진 JSON 형식을 확인해 주세요.');}
    }else value=raw.split(/[\n,]/);
  }
  if(!Array.isArray(value)||value.length>64)throw new Error('출연진 목록을 확인해 주세요.');
  const result:string[]=[],seen=new Set<string>();
  for(const item of value){
    const name=optionalText(item,100,'출연진 이름');
    if(!name)continue;
    const key=name.normalize('NFKC').toLocaleLowerCase();
    if(!seen.has(key)){seen.add(key);result.push(name);}
  }
  if(result.length>8)throw new Error('주요 출연진은 최대 8명입니다.');
  return result.length?result:null;
}

export function validateWorkMetadata(input:Record<string,unknown>):WorkMetadata{
  return {
    ...(input.creatorCredit!==undefined?{creatorCredit:optionalText(input.creatorCredit,240,'제작·감독')}:{}),
    ...(input.principalCast!==undefined?{principalCast:parsePrincipalCast(input.principalCast)}:{}),
    ...(input.synopsis!==undefined?{synopsis:optionalText(input.synopsis,1500,'작품 소개')}:{}),
    ...(input.releaseContext!==undefined?{releaseContext:optionalText(input.releaseContext,120,'공개 안내')}:{}),
  };
}

export function workMetadataValues(value:WorkMetadata){
  return {
    ...(value.creatorCredit!==undefined?{creatorCredit:value.creatorCredit}:{}),
    ...(value.principalCast!==undefined?{principalCast:value.principalCast?JSON.stringify(value.principalCast):null}:{}),
    ...(value.synopsis!==undefined?{synopsis:value.synopsis}:{}),
    ...(value.releaseContext!==undefined?{releaseContext:value.releaseContext}:{}),
  };
}

export function readPrincipalCast(value:string|null):string[]|null{
  if(!value)return null;
  try{return parsePrincipalCast(JSON.parse(value));}catch{console.warn('Invalid stored Work cast metadata');return null;}
}
