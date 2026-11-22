import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
let count=0;
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else if(/\.(js|html|json|map|txt|rsc)$/i.test(p)){count++;const text=await readFile(p,'utf8');assert(!/RACING_KEYRING|RACING_SEAL_KEY|RACING_BEACON_PUBLIC_JWK|private-manifest-|broadcast-qa-|secret_cipher|isolated-external-v1:/.test(text),'private marker in '+p);}}}
await scan('dist/client');await scan('public');assert(count>0);console.log('PASS checked built public assets for private module/data markers:',count);
