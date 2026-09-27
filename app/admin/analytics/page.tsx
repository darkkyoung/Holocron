import {requireAdminSession} from '@/lib/admin/session';
import {getAnalyticsReport} from '@/lib/analytics/service';
import AnalyticsDashboard from '@/components/admin/analytics-dashboard';

export const dynamic='force-dynamic';

export default async function AnalyticsPage(){
  await requireAdminSession();
  return <AnalyticsDashboard initialReport={await getAnalyticsReport()}/>;
}
