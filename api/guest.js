/* POST /api/guest  { name, anyway? }
   Looks the name up in the private guest list. Only that one guest's
   salutation and note come back; the list itself never leaves the server.
   Every visitor who gets past the gate also receives a signed pass for the
   music.

   200 { ok: true, known: true,  salutation, message, token, key }
   200 { ok: true, known: false, salutation, token, key }   when "anyway"
   200 { ok: false }                                        not on the list */

const { findGuest, issueToken, readJson, send } = require('./_lib');

module.exports = async function (req, res) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') return send(res, 405, JSON.stringify({ ok: false }), headers);

  const body = await readJson(req);
  const name = String(body.name || '').slice(0, 80).trim();
  const entry = name ? findGuest(name) : null;

  if (!entry && !body.anyway) return send(res, 200, JSON.stringify({ ok: false }), headers);

  const pass = issueToken();
  const reply = entry
    ? { ok: true, known: true, remember: entry.names[0], salutation: entry.salutation, message: entry.message || null }
    : { ok: true, known: false, remember: name, salutation: name || null, message: null };
  reply.token = pass.token;
  reply.key = pass.key;
  send(res, 200, JSON.stringify(reply), headers);
};
