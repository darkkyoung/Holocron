import {loadTestModules} from '../test-module-loader.mjs';
export async function loadV4(){
 const l=await loadTestModules([
  'lib/racing/v4/simulator.ts',
  'lib/racing/v2/playback.ts',
  'lib/racing/v2/camera.ts',
 ]);
 return {...l.modules['lib/racing/v4/simulator.ts'],
   ...l.modules['lib/racing/v2/playback.ts'],
   ...l.modules['lib/racing/v2/camera.ts'],
   dispose:l.dispose};
}
