import {requireAdminSession} from '@/lib/admin/session';
import VisibilityEditor from '@/components/site-visibility/visibility-editor';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdminSession();return <VisibilityEditor/>;}
