import {validImageUrl} from './sources';

export function normalizeManualImageUrl(value:unknown){
  if(typeof value!=='string')throw new Error('이미지 URL을 확인해 주세요.');
  const normalized=validImageUrl(value);
  if(!normalized)throw new Error('http 또는 https 이미지 URL을 입력해 주세요.');
  return normalized;
}
