import {requireAdminSession} from '@/lib/admin/session';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import SiteCopyAdmin from '@/components/admin/site-copy-admin';

export const dynamic='force-dynamic';

export default async function SiteCopyAdminPage(){
  await requireAdminSession();
  return <SiteCopyAdmin initialCopy={await loadSiteCopy()}/>;
}
