import {env} from 'cloudflare:workers';
import {gateway,type SnapshotReader} from '@/lib/racing-broadcast/gateway';
export const dynamic='force-dynamic';
export function GET(req:Request){return gateway(req,(env as unknown as {RACING_BROADCAST_READER?:SnapshotReader}).RACING_BROADCAST_READER);}
