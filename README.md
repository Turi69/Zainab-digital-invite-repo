# Zainab & Mmedaraobong: digital wedding invitation

A static, single-page invitation. Three acts:

1. **Name gate.** The guest types their name and the invitation is personalised.
2. **Envelope.** Tap the wax seal, the flap opens, the card rises out.
3. **The card.** One continuous card whose sections borrow the three printed
   variations in Figma (`Sync-Sales`, section `119523-19`): parchment with
   burgundy florals, burgundy velvet with white roses and gold, and ivory.
   A single gold frame runs the full length.

## Run it

```bash
node dev-server.js
```

Then open <http://localhost:4173>. This small server behaves like the Vercel
deployment: static files, the guest function in `api/`, and nothing served from
`private/`. (A plain static server will show the page, but the gate needs the
function.)

## Deploy it

On Vercel, import the GitHub repo (or run `npx vercel` in this folder). No build
step or framework setting is needed; `vercel.json` handles the rest.

Optional: set `GUESTS_JSON` in the Vercel project (Settings, Environment
Variables) to the guest list as JSON, if you would rather keep it out of the
repository altogether. It then overrides `private/guests.json`.

When you change a CSS or JS file, bump the `?v=` number on its link in
`index.html` so returning guests do not get a stale cached copy.

## What stays private

- **The guest list** lives in `private/guests.json`, on the server only. The
  gate sends the typed name to `api/guest` and gets back that one guest's
  salutation and note. The list itself never reaches the browser.
- **The song** is an ordinary file in `assets/audio/` and can be downloaded.
- **RSVP replies** are remembered only on the guest's own device
  (`localStorage` key `zm-invite-rsvp`), so the RSVP section can show their answer. A tap
  counts as the answer: WhatsApp cannot tell us whether the message was sent, so
  the card offers "Send my reply again". Replies themselves arrive in WhatsApp.
- **Plan your journey** builds a prompt and opens `chatgpt.com/?hints=search&q=…`
  in a new tab. The starting town (or, only if the guest taps "Use my location",
  coordinates rounded to about 1 km) goes into that prompt and nowhere else.
- `vercel.json` blocks `/private` and `/api/_lib.js` from being fetched directly.
- **The GitHub repository is public**, so anyone who finds it can read
  `private/guests.json`. Make the repository private if that matters; Vercel deploys from
  private repositories the same way.

## The arrival

- **Gate.** Petals and gold dust drift over the velvet behind the card. The card
  tilts up into place, the fleurons open from the centre, "The wedding of"
  tracks in and the couple's names write themselves in bronze. A golden light
  slides across the paper. When a name is accepted the card lifts and
  dissolves in a spray of sparks.
- **Envelope.** Real paper: each flap is its own sheet casting a soft shadow
  on the one below, lit from the top left, with faint handling creases
  (`assets/img/paper-crumple.webp`, a lit height map soft-light blended over
  the parchment; the gate card uses it too). Inside is a burgundy damask liner.
  It drops in with a soft bounce and floats, and "To [name]" writes itself in
  bronze ink. The seal is a rendered gold wax seal with the ZM sigil pressed
  into it (`assets/img/wax-seal.webp`), with a pulsing glow and sparkles.
- **Opening.** The seal cracks along a jagged line and falls away in two
  halves with wax shards and sparks. The flap opens, a letter bearing the
  sigil rises out, there is a warm flash, and several hundred petals, blossoms
  and leaves burst out to cover the screen. They then fall under their own
  weight (UIKit-style gravity of 1,000 pt/s² with per-item air resistance, so
  petals float and leaves drop faster), bounce softly on the bottom edge and
  settle into a heap, which rests a moment and fades. The invitation is
  already there underneath. The music starts on the same tap.

## What is on the card

| Section | What happens |
|---|---|
| Hero: the two of us | Parchment with burgundy florals growing in from all four corners. The couple photo rises into an arch whose bronze frame draws itself; photos crossfade with a slow push-in. The ZM seal presses down, then the couple's names **write themselves** in bronze foil with a spark on the pen nib. A swash draws underneath, "Two hearts, one love" is written, and the dates and place follow. A gust carries petals across the card. |
| A note for you | "Dear [name]," is handwritten, the personal note arrives word by word, then the signature is written. |
| Traditional Wedding | Burgundy, from printed card 2. The date rolls up to 19 and the rules extend. Photographic keepsakes settle into the bottom corners one after another: folded aso-oke and a carved calabash on the left, a carved gourd and a coral necklace (which keeps a slow sway) on the right. Cut-outs are `assets/img/trad-*.webp`. |
| Vow Exchange & Blessings | Ivory, from printed card 3. A pair of gold rings drops in, floats and catches the light. Reception venue and directions. |
| Countdown | Live days, hours, minutes and seconds to 2 PM WAT on 19 November. |
| Colours of the day | Silk swatches drop in with a travelling sheen. |
| RSVP | Handwritten "Will you join us?", a one-line heart drawing, Call and WhatsApp buttons. WhatsApp opens with a message that names the guest. |
| Closing | "See you in Uyo", written under a shower of petals. |

Throughout: petals, blossoms and leaves blow across the screen on a gusting
wind at three depths, with gold dust rising through them. The florals printed
on the card lean into the same gusts. Tapping the card sends up stars and hearts
and pushes nearby petals away. On a mouse, a trail of gold dust follows the
pointer. A small dock (Details, RSVP) appears once the guest scrolls past the
first section and tucks away at the RSVP.

## Music

`assets/audio/running-home-to-you.mp3` plays from the moment the guest taps the
seal (browsers only allow sound after a tap). It fades in to 40% volume over
3 seconds, fades out over the last 4 seconds of the track and fades back in as
it loops, for as long as the page is open. It fades out when the tab is hidden
and back in on return. The heart button at the top right beats with the music
(it reads the track's bass through a Web Audio analyser) and mutes or unmutes
it; a speaker badge and a brief "Tap to mute" label say what it does, and the
guest's choice is remembered.

To change the track, replace that file (or edit `SRC` in `assets/js/invite.js`).
Levels and fade lengths are `LEVEL`, `FADE_IN` and `FADE_OUT` in the same place.
The current file is 6.7 MB at 320 kbps; re-encoding it to 128 kbps would bring
it to about 2.7 MB with no audible loss through phone speakers.

## Editing it

### The guest list: `private/guests.json`

One entry per guest:

```json
{
  "names": ["Ada", "Ada Obi"],
  "salutation": "Ada",
  "message": "Their personal note…"
}
```

`names` are every spelling that should let them in; `salutation` is written as
"Dear Ada,"; `message` is optional and falls back to the default note in
`index.html`. Matching ignores case, extra spaces, accents and punctuation. A
guest who is not on the list gets two tries, then an **Open it anyway** link.
The name is remembered in `localStorage`; **Not [name]? Start again** clears it.

### The couple photos: `index.html`, section "1 · The two of us (hero)"

Each `<img class="arch__photo">` inside `.arch__window` is one slide; they
crossfade in order every 6.5 seconds. Add, remove or replace them, and set
`--pos` on each to choose the focal point of the crop (for example
`style="--pos: 50% 25%"` keeps faces near the top of the arch). Portrait photos
suit the arch best. Update each `alt` to describe the photo.

The two photos in there now are the ones from the Figma file and stand in until
the final photos arrive.

### Dates, times, venues

- Visible text: the two `piece--event` sections in `index.html`.
- Directions: the `href` on each **Directions** button (Google Maps search).
- Calendar files: `EVENTS` in `assets/js/invite.js` (times are UTC; WAT is UTC+1).
- Countdown target: `WEDDING` in `assets/js/invite.js`.
- RSVP number: the `tel:` link in the RSVP section of `index.html`, and
  `RSVP_NUMBER` in `assets/js/invite.js` for the WhatsApp replies.
- RSVP wording, celebrations and the journey prompt: `CELEBRATIONS`, `setRsvp`
  and `journeyPrompt` in `assets/js/invite.js`.

### Copy

The personal note default, the closing line and the photo caption are in
`index.html`. The default note is shown to guests without their own message.

## Handwriting

The script lines are not a font on the page. `assets/js/handwriting.js` loads
Great Vibes with [opentype.js](https://opentype.js.org), turns each line into
glyph outlines, and reveals them through a wide stroke that runs along each
contour, so the ink appears to leave a pen. Any element with `data-hw` is
written this way; `data-ink` chooses `bronze` (the Figma foil texture, for
parchment), `gold` (the Figma gold chrome, for burgundy) or `ink` (for the note).

If the font cannot load, the text stays live and is wiped in with CSS instead.

- Font: `assets/fonts/GreatVibes-sub.ttf`, Great Vibes (SIL Open Font Licence),
  subset to Latin and Latin Extended-A so accented names still write.
- Library: `assets/js/vendor/opentype.min.js`, opentype.js 1.3.4 (MIT).

## Typefaces

| Figma | Used here | Role |
|---|---|---|
| Anime | **Great Vibes** (handwritten) | Names, script lines |
| Verandah Reverie | **Pinyon Script** | Wax seal monogram |
| Lora | **Lora** | Everything else, exact match |

## Accessibility and motion

- Every handwritten line keeps its real text for screen readers; the drawing is
  `aria-hidden`.
- `prefers-reduced-motion: reduce` removes the wind, the writing, the reveals
  and every loop. The card appears complete and still.
- The gate is a focus-trapped dialog; errors are announced. The envelope opens
  with Enter or Space. Touch targets are at least 44px.
- The ambient layer pauses when the tab is hidden.

## Still to confirm

| Item | Where | Note |
|---|---|---|
| Couple photos | `index.html` | Placeholders from Figma until the final photos arrive. |
| Vow exchange venue | `index.html`, `invite.js` | The printed card gives 11 AM and the reception venue, but not where the vows take place. The calendar file uses the reception venue for now. |
| "Specially invite you" | `index.html` | The print says "Specially invites"; with two sets of parents the verb is plural. |
| Guest list | `private/guests.json` | Five sample entries. |

Unused files from the previous build can be deleted: `event-white.webp`,
`floral-archway.webp`, `floral-overlay.webp`, `flourish-*.png`,
`photo-1/2/3.webp` and `sticker-*.webp` in `assets/img`.
