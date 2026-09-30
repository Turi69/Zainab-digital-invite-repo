# Zainab & Mmedaraobong: digital wedding invitation

A static, single-page invitation. Two acts:

1. **Envelope.** Addressed "To Friends & Family" (or to one guest, from a
   personal link). Tap the envelope, the seal breaks, the flap opens, the card rises out.
2. **The card.** One continuous card whose sections borrow the three printed
   variations in Figma (`Sync-Sales`, section `119523-19`): parchment with
   burgundy florals, burgundy velvet with white roses and gold, and ivory.
   A single gold frame runs the full length.

## Run it

```bash
node dev-server.js
```

Then open <http://localhost:4173>. This small server behaves like the Vercel
deployment: static files, the guest function in `api/`, and nothing served from
`private/`. (A plain static server will show the page, but personal links need
the function.)

## Deploy it

On Vercel, import the GitHub repo (or run `npx vercel` in this folder). No build
step or framework setting is needed; `vercel.json` handles the rest.

Optional: set `GUESTS_JSON` in the Vercel project (Settings, Environment
Variables) to the guest list as JSON, if you would rather keep it out of the
repository altogether. It then overrides `private/guests.json`.

When you change a CSS or JS file, bump the `?v=` number on its link in
`index.html` so returning guests do not get a stale cached copy.

## What stays private

- **The guest list** lives in `private/guests.json`, on the server only. A
  personal link (`?to=Carly`) sends that one name to `api/guest` and gets back
  that guest's salutation and note. The list itself never reaches the browser.
- **The song** is an ordinary file in `assets/audio/` and can be downloaded.
- **RSVP replies** are remembered only on the guest's own device
  (`localStorage` key `zm-invite-rsvp`), so the RSVP section can show their answer. A tap
  counts as the answer: the page cannot tell whether the text was sent, so the
  card offers "Send my reply again". Replies arrive as text messages to
  0810 362 9516. The guest's name for the reply is kept on their device too
  (`zm-invite-name`).
- **Plan your journey** builds a prompt and opens `chatgpt.com/?hints=search&q=…`
  in a new tab. The starting town (or, only if the guest taps "Use my location",
  coordinates rounded to about 1 km) goes into that prompt and nowhere else.
- `vercel.json` blocks `/private` and `/api/_lib.js` from being fetched directly.
- **The GitHub repository is public**, so anyone who finds it can read
  `private/guests.json`. Make the repository private if that matters; Vercel deploys from
  private repositories the same way.

## The arrival

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
| Hero: the two of us | Parchment with burgundy florals growing in from all four corners. The ZM seal presses down as the centrepiece (the couple chose no photo), then their names **write themselves** in bronze foil with a spark on the pen nib. A swash draws underneath, "Two hearts, one love" is written, and the dates, place and Matthew 7:24–25 follow. A gust carries petals across the card. |
| A special message | "Dear Friends & Family," is handwritten, the couple's special message arrives word by word, then the signature is written. From a personal link it is "Dear [name]," and that guest's own note. |
| Traditional Wedding | Burgundy, from printed card 2. The date rolls up to 19 and the rules extend. Photographic keepsakes settle into the bottom corners one after another: folded aso-oke and a carved calabash on the left, a carved gourd and a coral necklace (which keeps a slow sway) on the right. Cut-outs are `assets/img/trad-*.webp`. |
| Vow Exchange & Blessings | Ivory, from printed card 3. A pair of gold rings drops in, floats and catches the light. Reception venue and directions. |
| Countdown | Live days, hours, minutes and seconds to 2 PM WAT on 19 November. |
| Dress code | "Dress beautifully and elegantly", with white and ivory swatches struck through for the white wedding day. |
| RSVP | Handwritten "Will you join us?", the call number (calls only) and the SMS number. The guest adds their name; "Yes" asks which celebration, and each reply opens a text message to 0810 362 9516 that leads with the answer. |
| Gifts | The two bank accounts, each with a one-tap "Copy number". |
| Closing | "Hope to see you in our beautiful city of Uyo to", then "Meet the Joshuas" written under a shower of petals. |

Throughout: petals, blossoms and leaves blow across the screen on a gusting
wind at three depths, with gold dust rising through them. The florals printed
on the card lean into the same gusts. Tapping the card sends up stars and hearts
and pushes nearby petals away. On a mouse, a trail of gold dust follows the
pointer. A small dock (Details, RSVP) appears once the guest scrolls past the
first section and tucks away at the RSVP.

## Music

`assets/audio/ordinary-wedding-version.mp3` (Alex Warren, "Ordinary", wedding version, chosen by the couple) plays from the moment the guest taps the
seal (browsers only allow sound after a tap). It fades in to 40% volume over
3 seconds, fades out over the last 4 seconds of the track and fades back in as
it loops, for as long as the page is open. It fades out when the tab is hidden
and back in on return. The heart button at the top right beats with the music
(it reads the track's bass through a Web Audio analyser) and mutes or unmutes
it; a speaker badge and a brief "Tap to mute" label say what it does. Every
visit starts with the music on; a mute lasts until the page is closed. If the
browser holds the song back, it starts on the guest's next tap.

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

Send each listed guest their own link: the site address with `?to=` and any one
of their `names`, for example `https://your-site.vercel.app/?to=Carly`. The
envelope then reads "To Carly" and the note becomes "Dear Carly," with their
`message` (without one, the couple's special message). Matching ignores case,
extra spaces, accents and punctuation. The plain address, or a name not on the
list, opens the general invitation for Friends & Family.

### Dates, times, venues

- Visible text: the two `piece--event` sections in `index.html`.
- Directions: the `href` on each **Directions** button (Google Maps search).
- Calendar files: `EVENTS` in `assets/js/invite.js` (times are UTC; WAT is UTC+1).
- Countdown target: `WEDDING` in `assets/js/invite.js`.
- RSVP numbers: the `tel:` (calls only) and `sms:` links in the RSVP section of
  `index.html`, and `RSVP_SMS` in `assets/js/invite.js` for the text replies.
- Bank details: the Gifts section of `index.html`.
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

**The scroll waits for the pen.** Every unwritten line on the card is a
stopping point: the page scrolls until that line is 14% from the top of the
screen and holds there until it is written (the personal note's word-by-word
reveal too). Scrolling up is never held; the dock's Details and RSVP links skip
the hold; a line that has not started 6 seconds after the guest reaches it lets
them through. With Reduce Motion on, lines appear at once and nothing is held.
`Handwriting.hold.debug()` in the console lists what is holding and why it let go.

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
- The envelope opens with a tap, Enter or Space. Touch targets are at least 44px.
- The ambient layer pauses when the tab is hidden.

## Still to confirm

| Item | Where | Note |
|---|---|---|
| Vow exchange venue | `index.html`, `invite.js` | The printed card gives 11 AM and the reception venue, but not where the vows take place. The calendar file uses the reception venue for now. |
| "Specially invite you" | `index.html` | The print says "Specially invites"; with two sets of parents the verb is plural. |
| Guest list | `private/guests.json` | Five sample entries. |

Unused files from the previous build can be deleted: `event-white.webp`,
`floral-archway.webp`, `floral-overlay.webp`, `flourish-*.png`,
`photo-1/2/3.webp` and `sticker-*.webp` in `assets/img`.
