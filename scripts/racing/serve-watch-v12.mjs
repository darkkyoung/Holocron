import {buildWatch} from './build-watch.mjs';
import {loadV12} from './load-v12.mjs';
await buildWatch({load:loadV12,simulate:'simulateMeetingV12',defaultSeed:'12pilot-2',specialSeed:'12pilot-88',label:'v0.12 HYPER PHANTOM WARP',outName:'galactic-racing-phase2-v12',version:'v0.12',cases:[
 {label:'Gold 후반 역전',seed:'12pilot-2'},
 {label:'Hyper Phantom Warp',seed:'12pilot-6'},
 {label:'Hyper 패배',seed:'12pilot-4'},
 {label:'궁극기 없는 경기',seed:'12pilot-0'},
 {label:'Hyper · 지름길',seed:'12pilot-72'},
 {label:'Hyper · 안전 취소',seed:'12pilot-19'},
 {label:'Hyper · 마지막 랩',seed:'12pilot-79'},
 {label:'Hyper · 효과 중 완주',seed:'12pilot-81'},
 {label:'Hyper 종료 후 리타이어',seed:'12pilot-630'},
 {label:'특별 DSQ',seed:'12pilot-88'},
]});
