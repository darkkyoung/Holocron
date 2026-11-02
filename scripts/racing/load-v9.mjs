import {loadTestModules} from '../test-module-loader.mjs';
export async function loadV9(){const l=await loadTestModules(['lib/racing/v9/simulator.ts','lib/racing/v9/ultimate.ts','lib/racing/v8/camera.ts','lib/racing/v2/playback.ts','prototypes/galactic-racing-v2/broadcast-director.ts']);return Object.assign({},...Object.values(l.modules),{dispose:l.dispose});}
