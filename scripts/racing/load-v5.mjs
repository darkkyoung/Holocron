import {loadTestModules} from '../test-module-loader.mjs';
export async function loadV5(){const l=await loadTestModules(['lib/racing/v5/simulator.ts','lib/racing/v5/track.ts','lib/racing/v5/qualifying.ts','lib/racing/v5/broadcast.ts','lib/racing/v2/playback.ts']);return Object.assign({},...Object.values(l.modules),{dispose:l.dispose});}
