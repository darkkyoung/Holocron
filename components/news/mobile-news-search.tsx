'use client';
import {createContext,useContext,useState} from 'react';
import {Search,X} from 'lucide-react';
import type {ReactNode} from 'react';

const SearchContext=createContext<{open:boolean;setOpen:(value:boolean)=>void}|null>(null);
export function MobileNewsSearchProvider({children}:{children:ReactNode}){
  const [open,setOpen]=useState(false);
  return <SearchContext.Provider value={{open,setOpen}}>{children}</SearchContext.Provider>;
}
export function useMobileNewsSearch(){
  const state=useContext(SearchContext);
  if(!state)throw new Error('News search must be within its provider');
  return state;
}
export function MobileNewsSearchButton(){
  const {open,setOpen}=useMobileNewsSearch();
  return <button className="mobile-news-search-button" type="button" aria-label={open?'뉴스 검색 닫기':'뉴스 검색 열기'} aria-controls="news-search-controls" aria-expanded={open} onClick={()=>{
    setOpen(!open);
    requestAnimationFrame(()=>document.getElementById(open?'news-results':'news-search-controls')?.scrollIntoView({block:'start'}));
  }}>{open?<X size={20} aria-hidden="true"/>:<Search size={20} aria-hidden="true"/>}</button>;
}
