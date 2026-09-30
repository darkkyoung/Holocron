import type {ReactNode} from 'react';
import styles from './public-geometry.module.css';

type PublicGeometryVariant='news'|'works'|'quiz';

function PublicGeometryBackground(){
  return <svg className={styles.geometry} viewBox="0 0 1440 3000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <g className={styles.heroGeometry}>
      <ellipse cx="1220" cy="270" rx="390" ry="210"/><ellipse cx="1220" cy="270" rx="265" ry="142"/>
      <path d="M-80 530 C230 390 430 610 715 455 S1130 260 1520 420"/>
      <path d="M85 70 L265 190 L445 120 L610 255"/>
      <circle cx="85" cy="70" r="4"/><circle cx="265" cy="190" r="3"/><circle cx="445" cy="120" r="4"/><circle cx="610" cy="255" r="3"/>
    </g>
    <g className={styles.contentGeometry}>
      <path d="M-70 990 L250 820 L505 1080 L785 900 L1115 1110 L1510 870"/>
      <ellipse cx="120" cy="1450" rx="410" ry="250" transform="rotate(-12 120 1450)"/>
      <path d="M1420 1350 C1120 1250 965 1510 735 1450 S330 1260 -40 1570"/>
      <ellipse cx="1320" cy="2130" rx="460" ry="290" transform="rotate(10 1320 2130)"/>
      <path d="M-40 2350 C260 2170 460 2440 750 2260 S1180 2180 1490 2390"/>
      <path d="M115 2800 L330 2630 L565 2780 L810 2580 L1085 2760 L1370 2540"/>
    </g>
    <g className={styles.waypoints}>
      <circle cx="250" cy="820" r="5"/><circle cx="505" cy="1080" r="4"/><circle cx="785" cy="900" r="5"/><circle cx="1115" cy="1110" r="4"/>
      <circle cx="735" cy="1450" r="5"/><circle cx="330" cy="2630" r="4"/><circle cx="810" cy="2580" r="5"/><circle cx="1085" cy="2760" r="4"/>
      <circle className={styles.waypointOrbit} cx="250" cy="820" r="17"/><circle className={styles.waypointOrbit} cx="735" cy="1450" r="19"/><circle className={styles.waypointOrbit} cx="1085" cy="2760" r="16"/>
    </g>
  </svg>;
}

export default function PublicGeometry({variant,children}:{variant:PublicGeometryVariant;children:ReactNode}){
  return <div className={`${styles.page} ${styles[variant]}`} data-public-geometry={variant}>
    <PublicGeometryBackground/>
    <div className={styles.content}>{children}</div>
  </div>;
}
