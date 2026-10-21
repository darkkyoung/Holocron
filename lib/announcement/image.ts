/** Canonical upload is a small, single-frame WebP, re-encoded by the browser.
 * Structural validation is not a general image decoder. No metadata/animation or
 * arbitrary MIME is served; nosniff/CSP and an image-only route contain decoding. */
export const MAX_IMAGE_BYTES=160*1024;
export const MAX_IMAGE_EDGE=1600;
export type AnnouncementImage={mime:'image/webp';data:string;width:number;height:number};
const invalid=():never=>{throw new Error('INVALID_ANNOUNCEMENT_IMAGE');};
/** Canvas encoders may add their own ICC profile. Strip metadata after encoding;
 * the server still rejects any metadata-bearing upload via validateImage(). */
export function stripEncodedWebPMetadata(bytes:Uint8Array):Uint8Array{
 if(bytes.length<20||bytes.length>MAX_IMAGE_BYTES)return invalid();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tag=(n:number)=>String.fromCharCode(...bytes.slice(n,n+4));
 if(tag(0)!=='RIFF'||tag(8)!=='WEBP'||view.getUint32(4,true)!==bytes.length-8)return invalid();
 const parts:Uint8Array[]=[bytes.slice(0,12)];let offset=12,count=0;
 while(offset<bytes.length){
  if(offset+8>bytes.length||++count>16)return invalid();
  const size=view.getUint32(offset+4,true),end=offset+8+size+(size%2),kind=tag(offset);
  if(!size||end>bytes.length)return invalid();
  if(!['ICCP','EXIF','XMP '].includes(kind)){
   const part=bytes.slice(offset,end);if(kind==='VP8X'){if(size!==10)return invalid();part[8]&=~(32|8|4);}
   parts.push(part);
  }
  offset=end;
 }
 const result=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let cursor=0;
 for(const part of parts){result.set(part,cursor);cursor+=part.length;}
 new DataView(result.buffer).setUint32(4,result.length-8,true);return result;
}
export function validateImage(value:unknown):AnnouncementImage|null{
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='data,height,mime,width')return invalid();
 const v=value as AnnouncementImage;
 if(v.mime!=='image/webp'||typeof v.data!=='string'||v.data.length>Math.ceil(MAX_IMAGE_BYTES/3)*4||v.data.length<32||v.data.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(v.data))return invalid();
 let binary:string;try{binary=atob(v.data);}catch{return invalid();}
 if(binary.length>MAX_IMAGE_BYTES||btoa(binary)!==v.data)return invalid();
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
 const str=(offset:number,n:number)=>String.fromCharCode(...bytes.slice(offset,offset+n));
 const u24=(offset:number)=>bytes[offset]+(bytes[offset+1]<<8)+(bytes[offset+2]<<16);
 if(str(0,4)!=='RIFF'||view.getUint32(4,true)!==bytes.length-8||str(8,4)!=='WEBP')return invalid();
 let width=0,height=0,extendedWidth=0,extendedHeight=0,offset=12;const chunks:string[]=[];
 while(offset<bytes.length){
  if(offset+8>bytes.length||chunks.length>=3)return invalid();
  const kind=str(offset,4),size=view.getUint32(offset+4,true),start=offset+8,end=start+size;
  if(!size||end>bytes.length||!['VP8X','ALPH','VP8 ','VP8L'].includes(kind)||chunks.includes(kind))return invalid();
  chunks.push(kind);
  if(kind==='VP8X'){
   if(size!==10||chunks.length!==1||(bytes[start]&~16)||bytes[start+1]||bytes[start+2]||bytes[start+3])return invalid();
   extendedWidth=u24(start+4)+1;extendedHeight=u24(start+7)+1;
  }else if(kind==='ALPH'){
   if(chunks.join(',')!=='VP8X,ALPH')return invalid();
  }else if(kind==='VP8 '){
   if(size<10||(bytes[start]&1)||str(start+3,3)!=='\x9d\x01\x2a')return invalid();
   width=view.getUint16(start+6,true)&0x3fff;height=view.getUint16(start+8,true)&0x3fff;
  }else{
   if(size<5||bytes[start]!==0x2f)return invalid();const bits=view.getUint32(start+1,true);
   if(bits>>>29)return invalid();width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;
  }
  offset=end+(size%2);if(offset>bytes.length||(size%2&&bytes[end]!==0))return invalid();
 }
 if(!['VP8 ','VP8L','VP8X,VP8 ','VP8X,ALPH,VP8 ','VP8X,VP8L'].includes(chunks.join(',')))return invalid();
 if(width<1||height<1||width>MAX_IMAGE_EDGE||height>MAX_IMAGE_EDGE||width!==v.width||height!==v.height||(extendedWidth&&(extendedWidth!==width||extendedHeight!==height)))return invalid();
 return {mime:'image/webp',data:v.data,width,height};
}
export function imageBytes(image:AnnouncementImage){return Uint8Array.from(atob(image.data),c=>c.charCodeAt(0));}
