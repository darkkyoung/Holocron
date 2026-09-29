import Link from 'next/link';

export default function PublicFooter({tagline,legal}:{tagline:string;legal:string}){
  return <footer className="public-footer">
    <Link className="footer-brand" href="/">HOLOCRON</Link>
    <span>{tagline}</span>
    <nav className="footer-links" aria-label="사이트 정보"><Link href="/roadmap">로드맵</Link></nav>
    <span>{legal}</span>
  </footer>;
}
