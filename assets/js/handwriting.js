/* ============================================================================
   Handwriting
   ----------------------------------------------------------------------------
   Turns a line of text into Great Vibes glyph outlines (via opentype.js) and
   writes it in: each glyph is revealed through a wide stroked mask that runs
   along its contour, so the ink appears to leave a pen rather than fade in.
   A spark rides the nib and sheds embers; once the line is written, the ink
   picks up a slow foil glint and a few stars settle on the letters.

   Usage
     Handwriting.prepare(el)          build the SVG (idempotent), hidden
     Handwriting.write(el) -> Promise  write it in
   Markup
     <span class="hw" data-hw data-ink="bronze|gold|ink">Text</span>
   If the font cannot load, the text stays live and is wiped in with CSS.
   ========================================================================== */

(function () {
  'use strict';

  var FONT_URL = 'assets/fonts/GreatVibes-sub.ttf';
  var NS = 'http://www.w3.org/2000/svg';
  var UNITS = 100;        // glyph size in SVG user units
  var MASK_W = 15;        // mask stroke width: wider than the heaviest stem
  var PAD = 10;           // viewBox padding so embers and the nib are not clipped
  var SPEED = 2300;       // outline units per second
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var fontPromise = null;
  var uid = 0;

  function loadFont() {
    if (fontPromise) return fontPromise;
    fontPromise = new Promise(function (resolve, reject) {
      if (!window.opentype) { reject(new Error('opentype.js missing')); return; }
      window.opentype.load(FONT_URL, function (err, font) {
        if (err) reject(err); else resolve(font);
      });
    });
    return fontPromise;
  }

  function svgEl(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  }

  /* ── Inks ───────────────────────────────────────────────────────────────
     gold:   polished chrome, for burgundy.
     bronze: the same chrome in deeper antique gold, so it holds its
             contrast on parchment.
     ink:    a deep brown-burgundy fountain-pen ink, for the note.
     Chrome runs top to bottom (bright above, a dark horizon through the
     letters, bright below) so every letter gets the same reflection,
     however long the line.                                              */
  var CHROME = {
    // On burgundy: light, luminous gold. The horizon is a warm mid-gold, never
    // brown, so the letters stay bright against the dark ground.
    gold:   [[0, '#FFFDF0'], [0.2, '#FFF0B8'], [0.4, '#FFD867'], [0.5, '#E6AE3E'],
             [0.55, '#D39A2E'], [0.63, '#FFD35C'], [0.82, '#FFF0A8'], [1, '#FFFBE8']],
    // On parchment: deeper antique gold, so it stands off the cream.
    bronze: [[0, '#C98C36'], [0.22, '#B87828'], [0.42, '#9A5C16'], [0.5, '#63340C'],
             [0.55, '#522A08'], [0.64, '#8E5418'], [0.82, '#B87A2C'], [1, '#D39B48']]
  };

  function makeInk(defs, id, ink, box) {
    if (CHROME[ink]) {
      var chrome = svgEl('linearGradient', {
        id: id, gradientUnits: 'userSpaceOnUse',
        x1: 0, y1: box.y + box.h * 0.18, x2: 0, y2: box.y + box.h * 0.86
      });
      CHROME[ink].forEach(function (s) {
        chrome.appendChild(svgEl('stop', { offset: s[0], 'stop-color': s[1] }));
      });
      defs.appendChild(chrome);
      return;
    }

    var stops = [[0, '#4A0025'], [0.5, '#5E1A2E'], [1, '#3E1420']];

    var grad = svgEl('linearGradient', {
      id: id, gradientUnits: 'userSpaceOnUse',
      x1: box.x, y1: box.y, x2: box.x + box.w * 0.55, y2: box.y + box.h * 1.4
    });
    stops.forEach(function (s) {
      grad.appendChild(svgEl('stop', { offset: s[0], 'stop-color': s[1] }));
    });
    defs.appendChild(grad);
  }

  // A soft specular band that travels across the letters every few seconds.
  function makeShine(defs, id, box) {
    var band = box.w * 0.28;
    var grad = svgEl('linearGradient', {
      id: id, gradientUnits: 'userSpaceOnUse',
      x1: box.x - band, y1: box.y, x2: box.x, y2: box.y + box.h * 0.35
    });
    [[0, 0], [0.42, 0], [0.5, 0.85], [0.58, 0], [1, 0]].forEach(function (s) {
      grad.appendChild(svgEl('stop', { offset: s[0], 'stop-color': '#FFF8E4', 'stop-opacity': s[1] }));
    });
    var travel = box.w + band * 2;
    var anim = svgEl('animateTransform', {
      attributeName: 'gradientTransform', type: 'translate',
      values: '0 0; ' + travel + ' 0; ' + travel + ' 0',
      keyTimes: '0; 0.32; 1', dur: '6.5s',
      begin: 'indefinite', repeatCount: 'indefinite'
    });
    grad.appendChild(anim);
    defs.appendChild(grad);
    return anim;
  }

  /* ── Build ────────────────────────────────────────────────────────────── */

  function build(el, font) {
    var text = el.getAttribute('data-hw-text') || el.textContent.trim();
    var ink = el.getAttribute('data-ink') || 'bronze';
    var id = 'hw' + (++uid);

    var glyphs = [];
    font.forEachGlyph(text, 0, 0, UNITS, { kerning: true }, function (glyph, gx, gy, size) {
      var path = glyph.getPath(gx, gy, size);
      var d = path.toPathData(2);
      if (!d) return;
      glyphs.push({ d: d, bb: path.getBoundingBox() });
    });
    if (!glyphs.length) return null;

    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    glyphs.forEach(function (g) {
      x1 = Math.min(x1, g.bb.x1); y1 = Math.min(y1, g.bb.y1);
      x2 = Math.max(x2, g.bb.x2); y2 = Math.max(y2, g.bb.y2);
    });
    var box = { x: x1 - PAD, y: y1 - PAD, w: (x2 - x1) + PAD * 2, h: (y2 - y1) + PAD * 2 };

    var svg = svgEl('svg', {
      class: 'hw__svg', viewBox: [box.x, box.y, box.w, box.h].join(' '),
      'aria-hidden': 'true', focusable: 'false'
    });
    // Size in em so every line written at the same font-size matches.
    svg.style.width = (box.w / UNITS).toFixed(3) + 'em';

    var defs = svgEl('defs', {});
    makeInk(defs, id + '-ink', ink, box);
    var shineAnim = makeShine(defs, id + '-shine', box);

    var mask = svgEl('mask', {
      id: id + '-mask', maskUnits: 'userSpaceOnUse',
      x: box.x, y: box.y, width: box.w, height: box.h
    });
    var maskGroup = svgEl('g', {
      fill: 'none', stroke: '#fff', 'stroke-width': MASK_W,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    mask.appendChild(maskGroup);
    defs.appendChild(mask);
    svg.appendChild(defs);

    var inkGroup = svgEl('g', { class: 'hw__ink', fill: 'url(#' + id + '-ink)', mask: 'url(#' + id + '-mask)' });
    var shineGroup = svgEl('g', { class: 'hw__shine', fill: 'url(#' + id + '-shine)' });

    var strokes = glyphs.map(function (g) {
      var m = svgEl('path', { d: g.d });
      maskGroup.appendChild(m);
      inkGroup.appendChild(svgEl('path', { d: g.d }));
      shineGroup.appendChild(svgEl('path', { d: g.d }));
      var len = m.getTotalLength();
      m.style.strokeDasharray = len + ' ' + (len + 2);
      m.style.strokeDashoffset = len;
      return { path: m, len: len };
    });

    svg.appendChild(inkGroup);
    svg.appendChild(shineGroup);

    // Keep the real text for screen readers, search and copy.
    var label = document.createElement('span');
    label.className = 'u-visually-hidden';
    label.textContent = text;
    el.textContent = '';
    el.appendChild(label);
    el.appendChild(svg);

    return { svg: svg, box: box, strokes: strokes, shine: shineAnim, ink: ink };
  }

  /* ── Pen, embers and stars ────────────────────────────────────────────── */

  function toPercent(state, pt) {
    return {
      x: ((pt.x - state.box.x) / state.box.w) * 100,
      y: ((pt.y - state.box.y) / state.box.h) * 100
    };
  }

  function ember(el, p) {
    var spark = document.createElement('span');
    spark.className = 'hw__ember';
    spark.style.left = p.x + '%';
    spark.style.top = p.y + '%';
    spark.style.setProperty('--dx', (Math.random() * 28 - 14).toFixed(1) + 'px');
    spark.style.setProperty('--dy', (Math.random() * 22 + 6).toFixed(1) + 'px');
    spark.style.setProperty('--s', (Math.random() * 0.6 + 0.5).toFixed(2));
    el.appendChild(spark);
    window.setTimeout(function () { spark.remove(); }, 1100);
  }

  function scatterStars(el, state, count) {
    for (var i = 0; i < count; i++) {
      var s = state.strokes[Math.floor(Math.random() * state.strokes.length)];
      var pt = s.path.getPointAtLength(Math.random() * s.len);
      var p = toPercent(state, pt);
      var star = document.createElement('span');
      star.className = 'hw__star';
      star.style.left = p.x + '%';
      star.style.top = p.y + '%';
      star.style.setProperty('--size', (Math.random() * 9 + 7).toFixed(0) + 'px');
      star.style.setProperty('--delay', (Math.random() * 5).toFixed(2) + 's');
      star.style.setProperty('--dur', (Math.random() * 2 + 2.6).toFixed(2) + 's');
      star.innerHTML = '<svg viewBox="0 0 20 20"><use href="#ic-spark"/></svg>';
      el.appendChild(star);
    }
  }

  /* ── Write ────────────────────────────────────────────────────────────── */

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function finish(el, state) {
    state.strokes.forEach(function (s) { s.path.style.strokeDashoffset = 0; });
    el.classList.remove('is-writing');
    el.classList.add('is-written');
    if (!reduceMotion.matches) {
      try { state.shine.beginElement(); } catch (err) { /* SMIL unsupported: no glint */ }
      var stars = parseInt(el.getAttribute('data-stars') || '', 10);
      if (isNaN(stars)) stars = Math.max(3, Math.min(9, Math.round(state.box.w / 120)));
      scatterStars(el, state, stars);
    }
  }

  /* The pen keeps pace with the reader. Each frame it measures how fast the
     line is travelling up the screen and, if the reader is scrolling on, writes
     just fast enough to finish while the line is still in view. If the line
     leaves the screen anyway, the pen stops mid-word and carries on from the
     same place when the reader comes back. The promise settles as soon as the
     line is finished or first scrolled away, so the rest of the section never
     waits on a line nobody is looking at. */
  var MAX_RATE = 6;

  function animate(el, state) {
    return new Promise(function (resolve) {
      var total = state.strokes.reduce(function (sum, s) { return sum + s.len; }, 0);
      var speed = parseFloat(el.getAttribute('data-speed')) || SPEED;
      var duration = Math.max(700, Math.min(4200, (total / speed) * 1000));

      if (reduceMotion.matches) { finish(el, state); resolve(); return; }

      var pen = document.createElement('span');
      pen.className = 'hw__pen';
      el.appendChild(pen);
      el.classList.add('is-writing');

      var t = 0;
      var last = null;
      var lastTop = null;
      var velocity = 0;          // px per second the line is rising, smoothed
      var lastEmber = 0;
      var waiting = null;

      // Off screen: stop the pen and wait until the line is back in view.
      function pause() {
        last = null; lastTop = null; velocity = 0;
        pen.style.opacity = 0;
        resolve();
        if (!('IntersectionObserver' in window)) { requestAnimationFrame(frame); return; }
        waiting = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          waiting.disconnect();
          waiting = null;
          requestAnimationFrame(frame);
        }, { threshold: 0.6 });
        waiting.observe(el);
      }

      function frame(now) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var shown = rect.height === 0 || (rect.bottom > 0 && rect.top < vh);
        if (!shown) { pause(); return; }

        var dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
        if (dt > 0 && lastTop !== null) {
          var v = (lastTop - rect.top) / dt;
          velocity += (v - velocity) * Math.min(1, dt * 10);
        }
        last = now;
        lastTop = rect.top;

        // Time left before the line nears the top edge, at the current scroll.
        var rate = 1;
        if (velocity > 40) {
          var left = (rect.top - vh * 0.08) / velocity;
          var needed = ((1 - t) * duration) / 1000;
          if (left > 0 && needed > left * 0.85) rate = Math.min(MAX_RATE, needed / (left * 0.85));
          else if (left <= 0) rate = MAX_RATE;
        }
        t = Math.min(1, t + (dt * 1000 * rate) / duration);
        var drawn = ease(t) * total;
        var acc = 0;
        var nib = null;

        for (var i = 0; i < state.strokes.length; i++) {
          var s = state.strokes[i];
          var local = Math.max(0, Math.min(s.len, drawn - acc));
          s.path.style.strokeDashoffset = s.len - local;
          if (!nib && local > 0 && local < s.len) nib = s.path.getPointAtLength(local);
          acc += s.len;
        }

        if (nib) {
          var p = toPercent(state, nib);
          pen.style.left = p.x + '%';
          pen.style.top = p.y + '%';
          pen.style.opacity = 1;
          if (now - lastEmber > 45) { ember(el, p); lastEmber = now; }
        }

        if (t < 1) { requestAnimationFrame(frame); return; }
        pen.classList.add('is-lifting');
        window.setTimeout(function () { pen.remove(); }, 500);
        finish(el, state);
        resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  /* ── Public ───────────────────────────────────────────────────────────── */

  var states = new WeakMap();

  function prepare(el) {
    if (states.has(el)) return Promise.resolve(states.get(el));
    return loadFont().then(function (font) {
      if (states.has(el)) return states.get(el);
      var state = build(el, font);
      if (!state) throw new Error('no glyphs');
      el.classList.add('is-ready');
      states.set(el, state);
      return state;
    }).catch(function () {
      el.classList.add('hw--fallback');
      states.set(el, null);
      return null;
    });
  }

  function write(el) {
    if (el.__hwWriting) return el.__hwWriting;
    el.__hwWriting = prepare(el).then(function (state) {
      if (!state) {
        // Fallback: live text, wiped in with CSS.
        el.classList.add('is-writing');
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            el.classList.remove('is-writing');
            el.classList.add('is-written');
            resolve();
          }, reduceMotion.matches ? 0 : 1600);
        });
      }
      return animate(el, state);
    });
    return el.__hwWriting;
  }

  // Replace the text of a line that has not been written yet (the guest's name).
  function setText(el, text) {
    if (states.has(el)) return;
    el.textContent = text;
  }

  window.Handwriting = { load: loadFont, prepare: prepare, write: write, setText: setText };
})();
