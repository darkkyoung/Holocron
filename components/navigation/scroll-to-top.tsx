'use client';

import {useEffect,useState} from 'react';
import {ArrowUp} from 'lucide-react';
import styles from './scroll-to-top.module.css';

export default function ScrollToTop(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const update=()=>setVisible(window.scrollY>560);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
  return <button className={styles.button} data-visible={visible} type="button" aria-label="페이지 맨 위로 이동" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><ArrowUp size={20} aria-hidden="true"/></button>;
}
