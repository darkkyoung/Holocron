import {requireAdminSession} from '@/lib/admin/session';
import Console from './console';
export default async function RacingAdmin(){await requireAdminSession();return <main><h1>레이싱 시즌 운영</h1><p>격리 환경 · 한국 표준시</p><Console/></main>;}
