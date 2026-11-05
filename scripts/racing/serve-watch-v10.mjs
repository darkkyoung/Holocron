import {buildWatch} from './build-watch.mjs';
import {loadV10} from './load-v10.mjs';
await buildWatch({load:loadV10,simulate:'simulateMeetingV10',defaultSeed:'10rw-8',specialSeed:'10rw-14',label:'PHASE 2-D v0.10 ACCEPTANCE · WORMHOLE / LOCK',outName:'galactic-racing-phase2-v10',version:'v0.10',cases:[
 {label:'Gold · 전체 지속시간 중계',seed:'10rw-1',id:'r7',tick:560},
 {label:'Hyper Wormhole',seed:'10rw-8',id:'r4',tick:832},
 {label:'Hyper · 짧은 도약',seed:'10rw-10',id:'r5',tick:1096},
]});
