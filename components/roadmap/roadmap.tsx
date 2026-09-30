import {ROADMAP_STAGE_IDS,type RoadmapCopy,type RoadmapStageId} from '@/lib/roadmap-copy';
import type {KeyboardEvent,MouseEvent} from 'react';
import styles from './roadmap.module.css';

const INTRO_HEIGHT=310;
const ROW_HEIGHT=180;

function CelestialBackdrop(){
  return <svg className={styles.celestialBackdrop} viewBox="0 0 1200 2600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <g className={styles.orbits}>
      <ellipse cx="-40" cy="360" rx="470" ry="230"/><ellipse cx="1220" cy="870" rx="520" ry="310"/>
      <ellipse cx="240" cy="1740" rx="610" ry="360" transform="rotate(-18 240 1740)"/><ellipse cx="1110" cy="2240" rx="490" ry="245" transform="rotate(12 1110 2240)"/>
      <path d="M-80 1050 C250 880 310 1260 610 1120 S1000 860 1280 1030"/><path d="M90 2600 C190 2220 510 2110 650 1830 S930 1420 1210 1510"/>
    </g>
    <g className={styles.constellations}>
      <path d="M82 620 L210 552 L310 662 L438 590"/><path d="M780 1420 L904 1328 L1010 1452 L1150 1360"/><path d="M70 2140 L205 2055 L332 2160"/>
      <circle cx="82" cy="620" r="4"/><circle cx="210" cy="552" r="3"/><circle cx="310" cy="662" r="5"/><circle cx="438" cy="590" r="3"/>
      <circle cx="780" cy="1420" r="4"/><circle cx="904" cy="1328" r="3"/><circle cx="1010" cy="1452" r="5"/><circle cx="1150" cy="1360" r="3"/>
      <circle cx="70" cy="2140" r="3"/><circle cx="205" cy="2055" r="5"/><circle cx="332" cy="2160" r="3"/>
    </g>
    <g className={styles.stars}>
      <circle cx="108" cy="160" r="2"/><circle cx="1030" cy="260" r="2"/><circle cx="188" cy="990" r="3"/><circle cx="1120" cy="1190" r="2"/>
      <circle cx="90" cy="1510" r="2"/><circle cx="1080" cy="1900" r="3"/><circle cx="430" cy="2380" r="2"/><circle cx="890" cy="2510" r="2"/>
    </g>
  </svg>;
}

function StageGeometry({itemCount}:{itemCount:number}){
  const height=INTRO_HEIGHT+itemCount*ROW_HEIGHT+70;
  return <svg className={styles.stageGeometry} viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <line className={styles.routeAxis} x1="500" y1="0" x2="500" y2={height}/><circle className={styles.majorOrbit} cx="500" cy="92" r="54"/><circle className={styles.majorNode} cx="500" cy="92" r="8"/>
    {Array.from({length:itemCount},(_,index)=>{
      const y=INTRO_HEIGHT+index*ROW_HEIGHT+ROW_HEIGHT/2,left=index%2===0,endpoint=left?165:835,bend=left?390:610;
      return <g className={styles.branch} key={index}><path d={`M500 ${y} C${bend} ${y} ${bend} ${y} ${endpoint} ${y}`}/><circle cx={endpoint} cy={y} r="5"/><circle cx={endpoint} cy={y} r="13" className={styles.branchOrbit}/></g>;
    })}
  </svg>;
}

type PreviewProps={previewMode?:boolean;selectedCopyKey?:string;onCopySelect?:(key:string)=>void};

export default function Roadmap({content,previewMode=false,selectedCopyKey,onCopySelect}:PreviewProps&{content:RoadmapCopy}){
  function copyProps(key:string,baseClass=''){
    if(!previewMode)return baseClass?{className:baseClass}:{};
    return {'data-roadmap-copy-key':key,className:`${baseClass} ${styles.copyTarget} ${selectedCopyKey===key?styles.copySelected:''}`,role:'button' as const,tabIndex:0,
      onClick:(event:MouseEvent)=>{event.stopPropagation();onCopySelect?.(key);},
      onKeyDown:(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onCopySelect?.(key);}}};
  }

  function stageView(id:RoadmapStageId,stageIndex:number){
    const stage=content.stages[id];
    return <section className={`${styles.stage} ${styles[id]}`} aria-labelledby={`roadmap-${id}`} key={id}>
      <StageGeometry itemCount={stage.items.length}/><header className={styles.stageHeader}>
        <span className={styles.stageSequence} aria-hidden="true">0{stageIndex+1}</span><p {...copyProps(`${id}.marker`)}>{stage.marker}</p>
        <h2 id={`roadmap-${id}`} {...copyProps(`${id}.title`)}>{stage.title}</h2><strong {...copyProps(`${id}.label`)}>{stage.label}</strong><span {...copyProps(`${id}.note`)}>{stage.note}</span>
      </header><ol className={styles.items}>{stage.items.map((item,index)=>{
        const side=index%2===0?'left':'right';
        return <li className={`${styles.item} ${styles[side]}`} key={index}><span className={styles.itemNode} aria-hidden="true"><i/></span><article>
          <small {...(id==='exploring'?copyProps('longTermItemLabel'):copyProps(`${id}.label`))}>{id==='exploring'?content.longTermItemLabel:`${stage.label.split(' · ')[0]} · ${String(index+1).padStart(2,'0')}`}</small>
          <h3 {...copyProps(`${id}.items.${index}.title`)}>{item.title}</h3><p {...copyProps(`${id}.items.${index}.description`)}>{item.description}</p>
        </article></li>;
      })}</ol>
    </section>;
  }

  return <main className={styles.page}><section className={styles.hero} aria-labelledby="roadmap-title">
    <div {...copyProps('hero.coordinates',styles.heroCoordinates)}>{content.hero.coordinates}</div><p className={styles.eyebrow}><span/><span {...copyProps('hero.eyebrow')}>{content.hero.eyebrow}</span></p>
    <h1 id="roadmap-title"><span {...copyProps('hero.titlePrimary')}>{content.hero.titlePrimary}</span> <span {...copyProps('hero.titleAccent')}>{content.hero.titleAccent}</span></h1>
    <p {...copyProps('hero.tagline',styles.lede)}>{content.hero.tagline.split('\n').map((line,index)=><span key={index}>{index>0&&<br/>}{line}</span>)}</p>
    <div className={styles.heroSigil} aria-hidden="true"><span/><i/><b/></div><p {...copyProps('hero.guide',styles.heroGuide)}>{content.hero.guide}</p>
  </section><div className={styles.celestialMap}><CelestialBackdrop/>{ROADMAP_STAGE_IDS.map(stageView)}<div className={styles.routeEnd} aria-hidden="true"><span/><i/><span/></div></div></main>;
}
