'use client';

import {useEffect,useRef} from 'react';
import type {PublicAnalyticsRoute} from '@/lib/analytics/domain';

export default function PageViewTracker({route}:{route:PublicAnalyticsRoute}){
  const sent=useRef(false);
  useEffect(()=>{
    if(sent.current)return;
    sent.current=true;
    void fetch('/api/analytics/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route}),keepalive:true}).catch(()=>undefined);
  },[route]);
  return null;
}
