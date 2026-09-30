import type {ReactNode} from 'react';
import styles from './public-geometry.module.css';

type PublicGeometryVariant='news'|'works'|'quiz';

function PublicGeometryBackground(){
  return <svg className={styles.geometry} viewBox="0 0 1440 3000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <g className={styles.stars}>
      <circle cx="74" cy="96" r="1"/><circle cx="324" cy="278" r="1.5"/><circle cx="520" cy="82" r=".9"/><circle className={styles.starBright} cx="940" cy="175" r="1.8"/>
      <circle cx="1305" cy="86" r="1.1"/><circle cx="1110" cy="620" r="1.4"/><circle className={styles.starWarm} cx="168" cy="715" r="1.2"/><circle cx="615" cy="744" r=".9"/>
      <circle cx="1370" cy="950" r="1.6"/><circle className={styles.starBright} cx="460" cy="1210" r="1.3"/><circle cx="940" cy="1298" r="1"/><circle cx="85" cy="1550" r="1.5"/>
      <circle cx="1210" cy="1715" r=".9"/><circle className={styles.starWarm} cx="690" cy="1850" r="1.4"/><circle cx="330" cy="2045" r="1"/><circle cx="1425" cy="2250" r="1.6"/>
      <circle className={styles.starBright} cx="880" cy="2415" r="1.2"/><circle cx="122" cy="2570" r=".9"/><circle cx="570" cy="2760" r="1.5"/><circle cx="1160" cy="2875" r="1"/>
    </g>
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
