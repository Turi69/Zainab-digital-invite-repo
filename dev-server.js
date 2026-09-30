/* Local preview that behaves like the Vercel deployment: static files, the
   /api functions, and nothing served from /private.

     node dev-server.js        then open http://localhost:4173           */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 4173;
const TYPES = {
  '.mp3': 'audio/mpeg', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon'
};
const api = { '/api/guest': require('./api/guest') };

http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = api[url.pathname];
  if (route) return route(req, res);

  let file = decodeURIComponent(url.pathname);
  if (file.endsWith('/')) file += 'index.html';
  const full = path.join(ROOT, file);
  const blocked = /^\/(private|api)\b|^\/\.|dev-server\.js$/.test(file);
  if (blocked || !full.startsWith(ROOT)) { res.statusCode = 404; return res.end('Not found'); }

  fs.readFile(full, function (err, data) {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(full)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Invitation running at http://localhost:' + PORT);
});
