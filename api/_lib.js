/* Shared by the guest and song functions. Files starting with an underscore
   in /api are not deployed as endpoints of their own. */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRIVATE = path.join(__dirname, '..', 'private');
// Set INVITE_SECRET in the Vercel project settings. The fallback only exists
// so the site still works locally without any setup.
const SECRET = process.env.INVITE_SECRET || 'zm-local-development-secret';
const TOKEN_HOURS = 12;

// Fold case, accents, punctuation and runs of whitespace so that
// "Ada  Obi", "ADA OBI" and "Àda Obi" all reach the same entry.
function normalise(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,'`’\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let guestIndex = null;
function findGuest(name) {
  if (!guestIndex) {
    // GUESTS_JSON (an environment variable) wins over the file, so the list
    // can be kept out of the repository entirely if you prefer.
    const raw = process.env.GUESTS_JSON || fs.readFileSync(path.join(PRIVATE, 'guests.json'), 'utf8');
    guestIndex = Object.create(null);
    JSON.parse(raw).forEach(function (entry) {
      (entry.names || []).forEach(function (n) {
        const key = normalise(n);
        if (key) guestIndex[key] = entry;
      });
    });
  }
  const key = normalise(name);
  return key ? guestIndex[key] || null : null;
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

// A signed, expiring pass issued at the gate. It carries the per-visit key
// the song is scrambled with.
function issueToken() {
  const payload = {
    exp: Date.now() + TOKEN_HOURS * 3600 * 1000,
    k: Array.from(crypto.randomBytes(12)).map((b) => b) // 3 x 32-bit words, as bytes
  };
  const body = b64(JSON.stringify(payload));
  const sig = b64(crypto.createHmac('sha256', SECRET).update(body).digest());
  return { token: body + '.' + sig, key: keyWords(payload.k) };
}

function readToken(token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  const expected = b64(crypto.createHmac('sha256', SECRET).update(body).digest());
  const a = Buffer.from(sig || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (err) { return null; }
  if (!payload || payload.exp < Date.now() || !Array.isArray(payload.k)) return null;
  return { key: keyWords(payload.k) };
}

function keyWords(bytes) {
  const out = [];
  for (let i = 0; i < 12; i += 4) {
    out.push(((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0);
  }
  return out;
}

/* A seekable keystream: word w of the stream depends only on the key and w,
   so each part of the file can be scrambled independently. The browser runs
   the identical function to unscramble. This is obfuscation for the inspect
   panel, not cryptography. */
function mix(x) {
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}
function keystreamWord(k, w) {
  return mix(mix((k[0] ^ Math.imul(w, 0x9E3779B1)) >>> 0 ^ k[1]) ^ k[2]);
}
function scramble(buf, k, offset) {
  // offset is a multiple of 4
  const out = Buffer.from(buf);
  const base = offset >>> 2;
  for (let i = 0; i < out.length; i++) {
    const word = keystreamWord(k, base + (i >>> 2));
    out[i] ^= (word >>> ((i & 3) * 8)) & 255;
  }
  return out;
}

function readJson(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (err) { return Promise.resolve({}); }
  }
  return new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; if (data.length > 1e4) req.destroy(); });
    req.on('end', function () { try { resolve(JSON.parse(data || '{}')); } catch (err) { resolve({}); } });
  });
}

function send(res, status, body, headers) {
  res.statusCode = status;
  Object.keys(headers || {}).forEach(function (h) { res.setHeader(h, headers[h]); });
  res.end(body);
}

module.exports = { PRIVATE, normalise, findGuest, issueToken, readToken, scramble, readJson, send };
