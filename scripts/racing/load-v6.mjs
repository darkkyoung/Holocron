import {loadTestModules} from '../test-module-loader.mjs';
export async function loadV6(){const l=await loadTestModules(['lib/racing/v6/simulator.ts','lib/racing/v6/broadcast.ts','lib/racing/v5/track.ts','lib/racing/v2/playback.ts']);return Object.assign({},...Object.values(l.modules),{dispose:l.dispose});}
