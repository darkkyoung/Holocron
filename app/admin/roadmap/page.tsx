import {requireAdminSession} from '@/lib/admin/session';
import {loadRoadmapCopyFresh} from '@/lib/roadmap-copy-repository';
import RoadmapCopyAdmin from '@/components/admin/roadmap-copy-admin';

export const dynamic='force-dynamic';

export default async function RoadmapCopyAdminPage(){
  await requireAdminSession();
  return <RoadmapCopyAdmin initialCopy={await loadRoadmapCopyFresh()}/>;
}
