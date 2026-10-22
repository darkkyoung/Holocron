import {extname} from 'node:path';

const mime = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8'};

/** Fixed in-memory resources only; no input can generate or replace a race. */
export function replayHandler(files, digest) {
  return (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    if (!/^(localhost|127\.0\.0\.1|terminal\.local)(:\d+)?$/.test(req.headers.host ?? '')) {
      res.writeHead(403); res.end('LOCAL_HOST_REQUIRED'); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {Allow:'GET, HEAD'}); res.end('READ_ONLY_REPLAY'); return;
    }
    const path = (req.url ?? '/').split('?')[0], body = files.get(path);
    if (!body) {res.writeHead(404); res.end('NOT_FOUND'); return;}
    res.setHeader('Content-Type', mime[extname(path)] ?? 'text/html; charset=utf-8');
    if (path === '/race.json') {
      res.setHeader('X-Race-SHA256', digest);
      res.setHeader('Content-Disposition', 'attachment; filename="race.json"');
    }
    res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : body);
  };
}
