import {orderWorks,type Work} from './types';

/** The featured card is a projection of catalog state, never persisted state. */
export function selectFeaturedWork(works:Work[]):Work|null{
  const recentMovies=works.filter(work=>work.status==='recent'&&work.type==='영화');
  if(recentMovies.length)return orderWorks('recent',recentMovies)[0]??null;
  const upcoming=works.filter(work=>work.status==='upcoming');
  return upcoming.length?orderWorks('upcoming',upcoming)[0]??null:null;
}
