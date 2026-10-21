import {MAX_IMAGE_BYTES,MAX_IMAGE_EDGE,stripEncodedWebPMetadata,validateImage,type AnnouncementImage} from './image';
/** Browser-only decoding + canvas re-encoding strips filenames and source metadata. */
export async function compressAnnouncementImage(file:File):Promise<AnnouncementImage>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<12||file.size>8*1024*1024)throw new Error('JPG, PNG, WebP 이미지(최대 8 MiB)를 선택해 주세요.');
 const head=new Uint8Array(await file.slice(0,12).arrayBuffer()),ascii=(a:number,b:number)=>String.fromCharCode(...head.slice(a,b));
 const matches=file.type==='image/jpeg'?head[0]===255&&head[1]===216&&head[2]===255:file.type==='image/png'?ascii(1,4)==='PNG'&&head[0]===137:ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(!matches)throw new Error('파일 내용과 이미지 형식이 일치하지 않습니다.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>24_000_000||Math.max(bitmap.width,bitmap.height)>8192)throw new Error('원본 이미지는 24MP, 한 변 8192px 이하로 줄여 주세요.');
  const scale=Math.min(1,MAX_IMAGE_EDGE/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('이미지를 처리할 수 없는 브라우저입니다.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.7,.58,.45]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(!blob||blob.type!=='image/webp')throw new Error('이 브라우저는 WebP 압축을 지원하지 않습니다.');
   if(blob.size>MAX_IMAGE_BYTES)continue;
   const bytes=stripEncodedWebPMetadata(new Uint8Array(await blob.arrayBuffer()));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   const image=validateImage({mime:'image/webp',data:btoa(binary),width:canvas.width,height:canvas.height});if(image)return image;
  }
  throw new Error('압축 후 160 KiB를 초과했습니다. 더 단순하거나 작은 이미지를 선택해 주세요.');
 }finally{bitmap.close();}
}
