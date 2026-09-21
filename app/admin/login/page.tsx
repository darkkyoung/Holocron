import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getAdminSession} from '@/lib/admin/session';

export const dynamic='force-dynamic';

export default async function AdminLogin({searchParams}:{searchParams?:Promise<{error?:string}>}){
  if(await getAdminSession())redirect('/admin');
  const params=searchParams?await searchParams:{};
  return <main className="admin-login-page"><section className="admin-login-card">
    <div className="brand-mark admin-login-mark">H</div>
    <div className="eyebrow">HOLOCRON / ADMIN ACCESS</div>
    <h1>관리자 로그인</h1>
    <p>아카이브 관리 기능은 승인된 운영자만 사용할 수 있습니다.</p>
    {params.error&&<div role="alert" className="admin-login-error">관리자 정보를 확인해 주세요.</div>}
    <form method="post" action="/api/admin/login" className="admin-login-form">
      <label htmlFor="username">ID</label>
      <input id="username" name="username" type="text" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit">관리자 화면 열기</button>
    </form>
    <Link className="admin-login-back" href="/">뉴스 아카이브로 돌아가기</Link>
  </section></main>;
}
