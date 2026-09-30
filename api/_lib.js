/* Helpers for the guest function. Files starting with an underscore in /api
   are not deployed as endpoints of their own. */

const fs = require('fs');
const path = require('path');

const PRIVATE = path.join(__dirname, '..', 'private');

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
let guestStamp = null;
function findGuest(name) {
  // Re-read the file whenever it changes, so an edited list is picked up
  // without restarting the local server.
  const file = path.join(PRIVATE, 'guests.json');
  if (!process.env.GUESTS_JSON) {
    let stamp = null;
    try { stamp = fs.statSync(file).mtimeMs; } catch (err) { /* read below reports it */ }
    if (stamp !== guestStamp) { guestIndex = null; guestStamp = stamp; }
  }
  if (!guestIndex) {
    // GUESTS_JSON (an environment variable) wins over the file, so the list
    // can be kept out of the repository entirely if you prefer.
    const raw = process.env.GUESTS_JSON || fs.readFileSync(file, 'utf8');
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

module.exports = { PRIVATE, normalise, findGuest, readJson, send };
