'use client';
/* eslint-disable @next/next/no-img-element -- bounded same-origin announcement image or local editor preview */
import {useState} from 'react';
import type {Crop} from '@/lib/announcement/domain';
import styles from './announcement.module.css';
export default function AnnouncementBanner({src,alt,decorative,crop}:{src:string;alt:string;decorative:boolean;crop:Crop}){
 const [failed,setFailed]=useState(false);
 return <div className={styles.banner}>{failed?<span className={styles.imageFallback} role={decorative?undefined:'img'} aria-label={decorative?undefined:alt}>HOLOCRON</span>:<img src={src} alt={decorative?'':alt} decoding="async" onError={()=>setFailed(true)} style={{objectPosition:`${crop.x}% ${crop.y}%`,transformOrigin:`${crop.x}% ${crop.y}%`,transform:`scale(${crop.zoom/100})`}}/>}</div>;
}
