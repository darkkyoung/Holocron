import {buildWatch} from './build-watch.mjs';
import {loadV11} from './load-v11.mjs';
await buildWatch({load:loadV11,simulate:'simulateMeetingV11',defaultSeed:'11lu-0',specialSeed:'11lu-81',label:'v0.11 FINAL CORRECTION · LATE ULTIMATE / GAP',outName:'galactic-racing-phase2-v11',version:'v0.11',cases:[
 {label:'Gold · 9랩과 10랩',seed:'11lu-0'},
 {label:'Hyper Wormhole',seed:'11lu-31'},
 {label:'DNF · 특별 DSQ',seed:'11lu-81'},
]});
