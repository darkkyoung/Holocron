import {fileURLToPath} from 'node:url';
import {loadTestModules} from '../test-module-loader.mjs';

// Local tooling only: reuse the repository's dependency-free TS module loader.
// No Worker, D1, runtime environment, credentials or Provider is initialized.
export const root=fileURLToPath(new URL('../../',import.meta.url));
export async function loadSimulator(){
  process.chdir(root);
  const loaded=await loadTestModules(['lib/racing/simulator.ts','lib/racing/config.ts']);
  return {...loaded.modules['lib/racing/simulator.ts'],...loaded.modules['lib/racing/config.ts'],dispose:loaded.dispose};
}
