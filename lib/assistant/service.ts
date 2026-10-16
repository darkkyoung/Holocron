import {readArchiveSnapshot} from '../news/archive-snapshot';
import {retrieveStories} from './retrieval';
import {storyEvidence} from './evidence';
import {issueReceipt,verifyReceipt,verifySelectedEvidence} from './receipts';
import type {RetrievalRequest} from './types';

export async function retrieveArchive(database:D1Database,request:RetrievalRequest,binding:string,secret:string|undefined,now=Date.now()){
  const snapshot=await readArchiveSnapshot(database,now),result=retrieveStories(snapshot,request);
  const candidates=result.candidates.map(({story,score,coverage})=>({...storyEvidence(story,result.terms),score,matchedTermCoverage:coverage}));
  const receipt=result.status==='ready'?await issueReceipt(snapshot,request,candidates.map(c=>c.storyId),binding,secret,now):null;
  return {status:result.status,reason:result.reason,candidates,workChoices:result.workChoices,resolvedWork:result.resolvedWork,searchTerms:result.terms,
    proposedStoryIds:request.mode==='qa'?candidates.slice(0,6).map(c=>c.storyId):[],receipt,archiveWindow:snapshot.archiveWindow,asOf:snapshot.asOf};
}
/** No provider or Credit operation. Always reload, including each later final check. */
export async function reloadSelectedEvidence(database:D1Database,token:unknown,selected:unknown,binding:string,secret:string|undefined,now=Date.now()){
  await verifyReceipt(token,binding,secret,now);
  return verifySelectedEvidence(token,selected,binding,secret,await readArchiveSnapshot(database,now),now);
}
