import {buildWatch} from './build-watch.mjs';
import {loadV9} from './load-v9.mjs';
await buildWatch({load:loadV9,simulate:'simulateMeetingV9',defaultSeed:'9ru-2',specialSeed:'9ru-59',label:'PHASE 2-D FINAL · v0.9 · ULTIMATE / PODIUM',outName:'galactic-racing-phase2-v9',version:'v0.9',cases:[
 {label:'P8 → P1 · Gold',seed:'9ru-2',id:'r6',tick:1096},
 {label:'Hyper Ultimate',seed:'9ru-7',id:'r6',tick:672},
 {label:'하위권 포디움 / 우승 실패',seed:'9ru-0',id:'r1',tick:888},
 {label:'지름길 + 궁극기',seed:'9ru-0',id:'r5',tick:576},
]});
