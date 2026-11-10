import {buildWatch} from './build-watch.mjs';
import {loadV14} from './load-v14.mjs';
await buildWatch({load:loadV14,simulate:'simulateMeetingV14',defaultSeed:'14case-0',specialSeed:'14case-31',label:'v0.14 ULTIMATE FREQUENCY',outName:'galactic-racing-phase2-v14',version:'v0.14',cases:[
 {label:'Gold 후반 역전',seed:'14case-0'},
 {label:'Hyper Phantom Warp',seed:'14case-3'},
 {label:'Hyper 패배',seed:'14case-57'},
 {label:'궁극기 없는 경기',seed:'14case-9'},
 {label:'연속 궁극기',seed:'14case-0'},
 {label:'궁극기 연출 중첩',seed:'14case-366'},
 {label:'Hyper → Gold 재역전',seed:'14case-2895'},
 {label:'Hyper · 안전 취소',seed:'14case-84'},
 {label:'선두 DNF',seed:'14case-9'},
 {label:'특별 DSQ',seed:'14case-31'},
]});
