import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,chmod,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {historicalSnapshot} from './assistant-e5j/history-snapshot.mjs';
const root=await mkdtemp(join(tmpdir(),'holocron-e5j-seal-test-')),path=join(root,'approval.json');
try{
 await writeFile(path,JSON.stringify({stateDir:root}),{mode:0o600});
 for(const dir of ['local-d1','mvp-smoke-e5b-v1','mvp-smoke-e5d-v1','mvp-smoke-e5f-v1','mvp-p44-e5h-v1'])await mkdir(join(root,dir),{mode:0o700});
 await writeFile(join(root,'budget.jsonl'),'synthetic',{mode:0o600});
 const db=join(root,'local-d1','test.sqlite');await writeFile(db,'db',{mode:0o600});
 const baseline=await historicalSnapshot(path);
 await writeFile(db+'-shm','SQLite read marks');assert.equal(await historicalSnapshot(path),baseline);
 await writeFile(join(root,'budget.lock'),'transient');assert.equal(await historicalSnapshot(path),baseline);
 await mkdir(join(root,'mvp-p44-e5j-v1'));await writeFile(join(root,'mvp-p44-e5j-v1','budget.jsonl'),'new scope');assert.equal(await historicalSnapshot(path),baseline);
 await writeFile(db+'-wal','uncheckpointed logical changes');assert.notEqual(await historicalSnapshot(path),baseline);await rm(db+'-wal');
 await chmod(db,0o640);assert.notEqual(await historicalSnapshot(path),baseline);await chmod(db,0o600);
 await writeFile(db,'changed bytes');assert.notEqual(await historicalSnapshot(path),baseline);await writeFile(db,'db');
 const unexpected=join(root,'mvp-p44-e5h-v1','receipt.sqlite-shm');await writeFile(unexpected,'not a SQLite read mark');assert.notEqual(await historicalSnapshot(path),baseline);await rm(unexpected);
 const link=join(root,'mvp-p44-e5h-v1','linked');await symlink(db,link);await assert.rejects(()=>historicalSnapshot(path),/LAYOUT/);await rm(link);
 await writeFile(path,JSON.stringify({stateDir:root,changed:true}));assert.notEqual(await historicalSnapshot(path),baseline);
 console.log('E5J history seal: 9 boundaries PASS (DB/WAL, bytes, modes, symlinks, approval, read marks, new-scope isolation). No ledger audit is simulated by this unit test.');
}finally{await rm(root,{recursive:true,force:true});}
