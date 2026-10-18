import {requireAdminSession} from '@/lib/admin/session';
import {db} from '@/lib/news';
import {policyDashboard} from '@/lib/credit/policy-settings/repository';
import CreditPolicyEditor from '@/components/admin/credit-policy-editor';
export const dynamic='force-dynamic';
export default async function CreditPolicyPage(){await requireAdminSession();return <CreditPolicyEditor initial={await policyDashboard(db())}/>;}
