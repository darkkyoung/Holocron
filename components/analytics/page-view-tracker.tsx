'use client';

import {useEffect,useRef} from 'react';
import type {PublicAnalyticsRoute} from '@/lib/analytics/domain';

export default function PageViewTracker({route}:{route:PublicAnalyticsRoute}){
  const lastSent=useRef<PublicAnalyticsRoute|null>(null);
  useEffect(()=>{
    if(lastSent.current===route)return;
    lastSent.current=route;
    void fetch('/api/analytics/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({route}),keepalive:true}).catch(()=>undefined);
  },[route]);
  return null;
}
