/* GET /api/song?t=<pass>&p=<part>
   The background music, only for visitors holding a pass from the gate, sent
   in parts (Vercel caps a function response at 4.5 MB) and scrambled with the
   pass's own key. The file has no public URL, and what the browser's network
   panel records is not a playable file. */

const fs = require('fs');
const path = require('path');
const { PRIVATE, readToken, scramble, send } = require('./_lib');

const FILE = path.join(PRIVATE, 'running-home-to-you.mp3');
const PART = 2 * 1024 * 1024;          // a multiple of 4, well under the cap
let cache = null;

module.exports = function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pass = readToken(url.searchParams.get('t'));
  if (!pass) return send(res, 403, 'Forbidden', { 'Cache-Control': 'no-store' });

  if (!cache) cache = fs.readFileSync(FILE);
  const parts = Math.ceil(cache.length / PART);
  const p = Math.max(0, Math.min(parts - 1, parseInt(url.searchParams.get('p') || '0', 10) || 0));
  const start = p * PART;
  const chunk = scramble(cache.subarray(start, Math.min(cache.length, start + PART)), pass.key, start);

  send(res, 200, chunk, {
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'private, no-store',
    'X-Song-Parts': String(parts),
    'X-Content-Type-Options': 'nosniff'
  });
};
