import {resolveCurrentCreditOwner} from '../../identity/current-owner';
import {createGuest} from '../../identity/service';
import {claimVisitRewards} from './repository';

export async function visitGuest(request:Request,database:D1Database,secret:string|undefined,now=new Date(),accountSecret?:string){
  let owner=await resolveCurrentCreditOwner(request,database,{guest:secret,account:accountSecret},now.getTime()),setCookie:string|null=null;
  if(!owner){const created=await createGuest(database,secret,now.getTime());owner=created.owner;setCookie=created.setCookie;}
  // Set the newly issued cookie even if rewards fail, so an ordinary retry reuses the zero wallet.
  try{return {state:await claimVisitRewards(database,owner,now),setCookie,error:false as const};}
  catch{return {state:null,setCookie,error:true as const};}
}
