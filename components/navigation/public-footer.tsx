export default function PublicFooter({tagline,legal}:{tagline:string;legal:string}){
  /* eslint-disable @next/next/no-html-link-for-pages */
  return <footer className="public-footer">
    <a className="footer-brand" href="/">HOLOCRON</a>
    <span>{tagline}</span>
    <nav className="footer-links" aria-label="사이트 정보"><a href="/roadmap">로드맵</a></nav>
    <span>{legal}</span>
  </footer>;
}
