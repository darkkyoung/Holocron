import {buildWatch} from './build-watch.mjs';
import {loadV13} from './load-v13.mjs';
await buildWatch({load:loadV13,simulate:'simulateMeetingV13',defaultSeed:'13pilot-10',specialSeed:'13pilot-203',label:'v0.13 FINAL LAP CINEMATIC',outName:'galactic-racing-phase2-v13',version:'v0.13',cases:[
 {label:'Gold 후반 역전',seed:'13pilot-10'},
 {label:'Hyper Phantom Warp',seed:'13pilot-12'},
 {label:'Hyper 패배',seed:'13pilot-96'},
 {label:'궁극기 없는 경기',seed:'13pilot-0'},
 {label:'Hyper · 지름길',seed:'13pilot-34'},
 {label:'Hyper · 안전 취소',seed:'13pilot-133'},
 {label:'선두 DNF',seed:'13pilot-15'},
 {label:'선두 DNF · 궁극기 긴급 중계',seed:'13edge-4919'},
 {label:'Hyper · 발동 순간 DNF',seed:'13edge-6110'},
 {label:'특별 DSQ',seed:'13pilot-203'},
]});
