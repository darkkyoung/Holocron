/** Pure spatial passing lanes. No frame history, RNG, progress or result writes.
 * Eight cars / 28 pairs. A narrow branch bounds the offset everywhere so a merge
 * cannot abruptly change the allowed lane. Extremely dense packs cannot all fit
 * side by side; the camera additionally widens instead of moving cars off-road.
 */
export const LANE_LIMIT=6.2;
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function passingLanes(points:Float64Array,headings:Float64Array,active:Uint8Array,order:readonly number[],out:Float64Array){
 out.fill(0);
 for(let i=0;i<8;i++)if(active[i])for(let j=i+1;j<8;j++)if(active[j]){
  const distance=Math.hypot(points[i*2]-points[j*2],points[i*2+1]-points[j*2+1]);
  const aligned=headings[i*2]*headings[j*2]+headings[i*2+1]*headings[j*2+1];
  const weight=smooth((24-distance)/18)*smooth((aligned-.5)/.4);
  const side=order[i]<order[j]?-1:1;out[i]+=side*weight;out[j]-=side*weight;
 }
 for(let i=0;i<8;i++)out[i]=LANE_LIMIT*Math.tanh(out[i]*.65);
 return out;
}
export function gridBlend(elapsed:number){return 1-smooth(elapsed/6000);}
