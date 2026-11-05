import {loadTestModules} from '../test-module-loader.mjs';
export async function loadV11(){const l=await loadTestModules(['lib/racing/v11/simulator.ts','lib/racing/v11/ultimate.ts','lib/racing/gap.ts','lib/racing/v2/playback.ts','prototypes/galactic-racing-v2/broadcast-director.ts']);return Object.assign({},...Object.values(l.modules),{dispose:l.dispose});}
