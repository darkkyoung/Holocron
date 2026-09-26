import type {Work} from './types';

export const WORK_DESTINATION_URLS={
  disneyPlus:'https://www.disneyplus.com/ko-kr',
  ticketing:{
    cgv:'https://cgv.co.kr/cnm/movieBook/movie',
    lotteCinema:'https://www.lottecinema.co.kr/NLCHS/Ticketing',
    megabox:'https://www.megabox.co.kr/movie',
  },
} as const;

export type WorkDestination=
  |{kind:'official';url:string}
  |{kind:'ticket'}
  |{kind:'disney-plus';url:string}
  |{kind:'unavailable'};

export function resolveWorkDestination(work:Work):WorkDestination{
  if(work.status==='upcoming')return work.officialUrl?{kind:'official',url:work.officialUrl}:{kind:'unavailable'};
  if(work.status==='recent'&&work.type==='영화')return {kind:'ticket'};
  return {kind:'disney-plus',url:WORK_DESTINATION_URLS.disneyPlus};
}
