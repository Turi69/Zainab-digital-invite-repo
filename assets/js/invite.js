/* ============================================================================
   Zainab & Mmedaraobong: invitation behaviour
   Three acts: name gate -> envelope -> invitation.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'zm-invite-guest';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var el = {
    gate:         document.getElementById('gate'),
    gateCard:     document.getElementById('gateCard'),
    gateForm:     document.getElementById('gateForm'),
    gateInput:    document.getElementById('gateInput'),
    gateError:    document.getElementById('gate-error'),
    gateSkip:     document.getElementById('gateSkip'),
    stage:        document.getElementById('stage'),
    envelope:     document.getElementById('envelope'),
    envelopeOpen: document.getElementById('envelopeOpen'),
    envelopeName: document.getElementById('envelopeName'),
    invite:       document.getElementById('invite'),
    salutation:   document.getElementById('guestSalutation'),
    guestMessage: document.getElementById('guestMessage'),
    resetName:    document.getElementById('resetName'),
    resetGuest:   document.getElementById('resetGuest'),
    rsvpYes:      document.getElementById('rsvpYes'),
    rsvpNo:       document.getElementById('rsvpNo'),
    attend:       document.getElementById('attendDialog'),
    dock:         document.getElementById('dock'),
    ambient:      document.getElementById('ambient')
  };

  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, reduceMotion.matches ? 0 : ms); });
  }

  /* ── Guest lookup ─────────────────────────────────────────────────────
     The list lives on the server (/api/guest). The page only ever learns the
     salutation and note of the name that was typed.                       */

  function askGate(name, anyway) {
    var request = fetch('api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, anyway: !!anyway })
    }).then(function (res) {
      if (!res.ok) throw new Error('gate ' + res.status);
      return res.json();
    });
    // Never leave a guest waiting on a slow connection.
    var timeout = new Promise(function (resolve, reject) {
      window.setTimeout(function () { reject(new Error('timeout')); }, 6000);
    });
    return Promise.race([request, timeout]);
  }

  var defaultMessage = el.guestMessage ? el.guestMessage.textContent.replace(/\s+/g, ' ').trim() : '';

  function applyGuest(entry) {
    var salutation = (entry && entry.salutation) || 'friend';
    if (el.salutation) window.Handwriting.setText(el.salutation, 'Dear ' + salutation + ',');
    if (el.resetName)    el.resetName.textContent = salutation;
    if (el.envelopeName) window.Handwriting.setText(el.envelopeName, 'To ' + salutation);
    if (el.guestMessage) el.guestMessage.textContent = (entry && entry.message) || defaultMessage;
    setRsvp(entry ? salutation : '');
    document.title = entry ? salutation + ', you are invited' : 'Zainab & Mmedaraobong: you are invited';
  }

  // The RSVP replies open WhatsApp with a message already written. A couple
  // or a family ("Mummy and Daddy", "The Alis") answers as "we". The answer
  // heads the message in bold (WhatsApp's *asterisks*), so the couple can
  // read every reply at a glance in their chat list.
  var RSVP_NUMBER = '2347031299072';
  var CELEBRATIONS = {
    trad: { title: 'Traditional Wedding, Thursday 19 November',
            line: 'the Traditional Wedding on Thursday 19 November' },
    vows: { title: 'Vow Exchange & Blessings, Saturday 21 November',
            line: 'the Vow Exchange and Blessings on Saturday 21 November' },
    both: { title: 'Both celebrations, 19 & 21 November',
            line: 'both the Traditional Wedding on Thursday 19 November and the Vow Exchange and Blessings on Saturday 21 November' }
  };

  function waLink(lines) {
    return 'https://wa.me/' + RSVP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  function setRsvp(name) {
    var we = /\s(and|&)\s|^the\s/i.test(name);
    var hi = 'Hello Zainab and Mmedaraobong' + (name ? ', it’s ' + (we ? 'us, ' : '') + name : '') + '.';
    var yes = we ? 'Yes, we’ll be there' : 'Yes, I’ll be there';
    var no = we ? 'Sadly, we can’t make it' : 'Sadly, I can’t make it';

    function yesLink(key) {
      var c = CELEBRATIONS[key];
      return waLink([
        '*' + yes + '*',
        '*' + c.title + '*',
        '',
        hi + ' Thank you so much for the beautiful invitation. ' +
          (we ? 'We are delighted to say yes: we will be there for ' + c.line + ', and we cannot wait to celebrate with you both. '
              : 'I am delighted to say yes: I will be there for ' + c.line + ', and I cannot wait to celebrate with you both. ') +
          'Congratulations 🤍'
      ]);
    }

    if (el.rsvpYes) {
      // Without the chooser (no <dialog> support) the button still sends a yes.
      el.rsvpYes.href = yesLink('both');
      el.rsvpYes.querySelector('[data-rsvp-label]').textContent = yes;
    }
    if (el.rsvpNo) {
      el.rsvpNo.href = waLink([
        '*' + no + '*',
        '',
        hi + ' Thank you so much for the beautiful invitation, it truly means a lot. ' +
          (we ? 'Sadly, we will not be able to make it, but we will be with you in spirit and cheering you on from afar. '
              : 'Sadly, I will not be able to make it, but I will be with you in spirit and cheering you on from afar. ') +
          'Wishing you both a lifetime of love and joy 🤍'
      ]);
      el.rsvpNo.querySelector('[data-rsvp-label]').textContent = no;
    }
    if (el.attend) {
      Array.prototype.forEach.call(el.attend.querySelectorAll('[data-attend]'), function (a) {
        a.href = yesLink(a.getAttribute('data-attend'));
      });
    }
  }
  setRsvp('');

  /* ── Which celebration? ─────────────────────────────────────────────────
     "Yes" opens a small card, dressed like the top of the invitation, asking
     which celebration the guest will come to. Each choice opens WhatsApp
     with that choice written into the reply. */
  function attendChooser() {
    var dialog = el.attend;
    if (!el.rsvpYes || !dialog || typeof dialog.showModal !== 'function') return;
    var card = dialog.querySelector('.attend__card');
    var title = dialog.querySelector('.hw--attend');
    var closing = false;

    function open(event) {
      event.preventDefault();
      if (dialog.open) return;
      closing = false;
      dialog.classList.remove('is-closing');
      document.documentElement.classList.add('is-attending');
      dialog.showModal();
      // Next frame, so the florals and the card animate in from their start.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dialog.classList.add('is-open');
          card.classList.add('is-in');
        });
      });
      if (title) window.setTimeout(function () { window.Handwriting.write(title); }, 450);
      if (ambient) ambient.flurry(16, 'left');
    }

    function close() {
      if (!dialog.open || closing) return;
      closing = true;
      dialog.classList.add('is-closing');
      dialog.classList.remove('is-open');
      window.setTimeout(function () {
        dialog.close();
        dialog.classList.remove('is-closing');
        card.classList.remove('is-in');
        document.documentElement.classList.remove('is-attending');
        closing = false;
      }, reduceMotion.matches ? 0 : 320);
    }

    el.rsvpYes.addEventListener('click', open);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog || event.target.closest('[data-attend-close]')) close();
    });
    // The link opens WhatsApp in a new tab; tidy the card away behind it.
    Array.prototype.forEach.call(dialog.querySelectorAll('[data-attend]'), function (a) {
      a.addEventListener('click', function () { window.setTimeout(close, 250); });
    });
  }

  function rememberGuest(name) {
    try {
      if (name) localStorage.setItem(STORAGE_KEY, name);
    } catch (err) { /* private browsing: personalisation is per-session only */ }
  }

  /* ── Act one: the gate ────────────────────────────────────────────────── */

  var attempts = 0;

  function showGate() {
    el.gate.hidden = false;
    requestAnimationFrame(function () {
      el.gate.classList.add('is-visible');
      var names = Array.prototype.slice.call(el.gate.querySelectorAll('[data-hw]'));
      wait(1000).then(function () { return writeLines(names); });
      // Focus once the form has arrived, so the caret does not blink over an empty card.
      window.setTimeout(function () { el.gateInput.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 3000);
    });
    document.addEventListener('keydown', trapFocus, true);
  }

  function hideGate() {
    document.removeEventListener('keydown', trapFocus, true);
    el.gate.classList.remove('is-visible');
    el.gate.classList.add('is-leaving');
    var card = el.gateCard.getBoundingClientRect();
    burst(el.gateCard, 16, card.left + card.width / 2, card.top + card.height / 2, 0.3);
    if (ambient) ambient.flurry(10, 'left');
    window.setTimeout(function () {
      el.gate.classList.remove('is-leaving');
      el.gate.hidden = true;
      showStage();
    }, reduceMotion.matches ? 0 : 700);
  }

  // The gate is the only way in, so focus stays inside it.
  function trapFocus(event) {
    if (event.key !== 'Tab' || el.gate.hidden) return;
    var focusable = el.gateCard.querySelectorAll(
      'input, button:not([hidden]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  function showError(message) {
    el.gateError.textContent = message;
    el.gateError.classList.add('is-shown');
    el.gateCard.classList.remove('is-shaking');
    void el.gateCard.offsetWidth;            // restart the animation
    el.gateCard.classList.add('is-shaking');
    el.gateInput.select();
  }

  function clearError() {
    el.gateError.classList.remove('is-shown');
    el.gateError.textContent = '';
  }

  var submit = el.gateForm.querySelector('.gate__submit');
  var submitLabel = submit ? submit.textContent : '';

  function busy(on) {
    if (!submit) return;
    submit.disabled = on;
    submit.textContent = on ? 'Finding your invitation…' : submitLabel;
  }

  el.gateForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = el.gateInput.value;

    if (!value.trim()) {
      showError('Please add your name so we know which note to show you.');
      return;
    }

    busy(true);
    askGate(value, false).then(function (reply) {
      busy(false);
      if (!reply.ok) {
        attempts += 1;
        // Two misses is enough. A guest whose nickname we did not think of
        // should never be locked out of their friends' wedding.
        if (attempts >= 2) el.gateSkip.hidden = false;
        showError(
          attempts >= 2
            ? 'Still no match. Try the name on your save the date, or open it anyway.'
            : 'We cannot find that name. Try the spelling on your save the date.'
        );
        return;
      }
      clearError();
      applyGuest(reply);
      rememberGuest(reply.remember);
      hideGate();
    }).catch(function () {
      busy(false);
      el.gateSkip.hidden = false;
      showError('Could not check the guest list just now. Open it anyway, or try again.');
    });
  });

  el.gateInput.addEventListener('input', function () {
    if (el.gateError.classList.contains('is-shown')) clearError();
  });

  el.gateSkip.addEventListener('click', function () {
    var typed = el.gateInput.value.trim();
    clearError();
    applyGuest(typed ? { salutation: typed } : null);
    // They have already been let in once; do not make them type it again.
    rememberGuest(typed);
    hideGate();
  });

  el.resetGuest.addEventListener('click', function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* nothing to clear */ }
    location.reload();
  });

  /* ── Act two: the envelope ────────────────────────────────────────────── */

  function showStage() {
    el.stage.hidden = false;
    // No automatic focus: Enter or Space already open the envelope, and a
    // programmatic focus would draw the keyboard ring for mouse and touch too.
    wait(1100).then(function () { return window.Handwriting.write(el.envelopeName); });
  }

  var opened = false;

  function openEnvelope() {
    if (opened) return;
    opened = true;

    el.invite.hidden = false;
    window.scrollTo(0, 0);
    document.body.classList.add('is-opened');
    music.start();
    el.stage.classList.add('is-leaving');
    splitWords(el.guestMessage);
    prepareHandwriting();

    // The seal cracks: sparks and wax shards fly off it.
    var seal = document.getElementById('envelopeSeal').getBoundingClientRect();
    var sx = seal.left + seal.width / 2, sy = seal.top + seal.height / 2;
    burst(el.envelope, 18, sx, sy, 0.25);
    shards(sx, sy, 12);

    // The letter rises, then a flash and a burst of flowers fills the screen
    // and a gust blows them away to reveal the invitation.
    var scene = el.envelope.getBoundingClientRect();
    window.setTimeout(function () {
      var flash = document.getElementById('flash');
      if (flash && !reduceMotion.matches) {
        flash.classList.remove('is-flashing');
        void flash.offsetWidth;
        flash.classList.add('is-flashing');
      }
      petalBurst(scene.left + scene.width / 2, scene.top + scene.height * 0.2);
    }, reduceMotion.matches ? 0 : 1050);

    // The invitation starts arranging itself as the gust clears the screen.
    window.setTimeout(playIntro, reduceMotion.matches ? 0 : 2100);

    var settle = reduceMotion.matches ? 0 : 2100;
    window.setTimeout(function () {
      el.stage.hidden = true;
      document.body.classList.remove('is-sealed');
      el.invite.setAttribute('tabindex', '-1');
      el.invite.focus({ preventScroll: true });
    }, settle);
  }

  el.envelopeOpen.addEventListener('click', openEnvelope);

  document.addEventListener('keydown', function (event) {
    if (!el.gate.hidden || opened || el.stage.hidden) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEnvelope();
    }
  });

  /* ── Act three: the invitation ────────────────────────────────────────── */

  var pieces = Array.prototype.slice.call(document.querySelectorAll('[data-piece]'));
  var hero = document.getElementById('piece-invite');

  function prepareHandwriting() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-hw]'), function (node) {
      window.Handwriting.prepare(node);
    });
  }

  // Wrap each word so the note can arrive the way it is read.
  function splitWords(node) {
    if (!node || node.getAttribute('data-split')) return;
    var words = node.textContent.replace(/\s+/g, ' ').trim().split(' ');
    node.textContent = '';
    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--w', i);
      span.textContent = word;
      node.appendChild(span);
      node.appendChild(document.createTextNode(' '));
    });
    node.setAttribute('data-split', String(words.length));
  }

  // Write every line in a piece, one after another, in document order.
  function writeLines(lines) {
    return lines.reduce(function (chain, node) {
      return chain.then(function () {
        var delay = parseInt(node.getAttribute('data-delay') || '0', 10);
        return wait(delay).then(function () { return window.Handwriting.write(node); });
      });
    }, Promise.resolve());
  }

  function playIntro() {
    hero.classList.add('is-in');
    // The rest of the card is ready as soon as the guest scrolls to it,
    // even if the names are still being written.
    watchPieces();
    startSlideshow(hero);
    var names = Array.prototype.slice.call(hero.querySelectorAll('.hero__names [data-hw]'));
    var afterNames = Array.prototype.slice.call(hero.querySelectorAll('[data-hw][data-after-names]'));

    // Florals grow in, the photo rises into its arch and the seal presses
    // down; the pen starts once the portrait has settled.
    wait(2600)
      .then(function () {
        return names.reduce(function (chain, node, i) {
          return chain.then(function () {
            return wait(i ? 140 : 0).then(function () { return window.Handwriting.write(node); });
          });
        }, Promise.resolve());
      })
      .then(function () {
        hero.classList.add('is-names-done');
        burst(hero.querySelector('.hero__names'), 26);
        // As the ink dries, a gust carries a flurry of petals across the card.
        if (ambient) ambient.flurry(18, 'left');
        return writeLines(afterNames);
      })
      .then(showDock);
  }

  function watchPieces() {
    var rest = pieces.filter(function (p) { return p !== hero; });
    if (!('IntersectionObserver' in window)) { rest.forEach(playPiece); return; }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        playPiece(entry.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -6% 0px' });
    rest.forEach(function (p) { observer.observe(p); });
  }

  function playPiece(piece) {
    piece.classList.add('is-in');

    Array.prototype.forEach.call(piece.querySelectorAll('[data-count]'), countUp);
    startSlideshow(piece);

    var lines = Array.prototype.slice.call(piece.querySelectorAll('[data-hw]:not([data-after-words])'));
    var written = writeLines(lines);
    written.then(function () { piece.classList.add('is-hw-done'); });

    var words = piece.querySelector('[data-words]');
    if (words) {
      var count = parseInt(words.getAttribute('data-split') || '0', 10);
      written
        .then(function () {
          piece.classList.add('is-reading');
          return wait(count * 55 + 500);
        })
        .then(function () {
          piece.classList.add('is-words-done');
          return wait(500);
        })
        .then(function () {
          return writeLines(Array.prototype.slice.call(piece.querySelectorAll('[data-hw][data-after-words]')));
        });
    }

    if (piece.classList.contains('finale')) {
      written.then(function () {
        burst(piece.querySelector('.finale__title'), 34, undefined, undefined, 0.35);
        if (ambient) ambient.flurry(34, 'top');
      });
    }
  }

  // Couple photos crossfade inside the arch, each with a slow push-in.
  function startSlideshow(piece) {
    var photos = piece.querySelectorAll('.arch__photo');
    if (!photos.length || piece.__slides) return;
    piece.__slides = true;
    var current = 0;
    photos[0].classList.add('is-current');
    if (photos.length < 2 || reduceMotion.matches) return;
    window.setInterval(function () {
      if (document.hidden) return;
      photos[current].classList.remove('is-current');
      current = (current + 1) % photos.length;
      photos[current].classList.add('is-current');
    }, 6500);
  }

  // Dates roll up to their number, the way a hotel clock settles.
  function countUp(node) {
    var target = parseInt(node.getAttribute('data-count'), 10);
    if (reduceMotion.matches || !target) { node.textContent = target; return; }
    var start = null;
    var duration = 1300;
    window.setTimeout(function () {
      requestAnimationFrame(function step(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 4);
        node.textContent = Math.max(1, Math.round(eased * target));
        if (t < 1) requestAnimationFrame(step);
        else node.classList.add('is-settled');
      });
    }, 420);
  }

  /* ── Sparkle bursts ───────────────────────────────────────────────────── */

  function burst(anchor, count, x, y, hearts) {
    if (reduceMotion.matches || !anchor) return;
    hearts = hearts || 0;
    var rect = anchor.getBoundingClientRect();
    var cx = x !== undefined ? x : rect.left + rect.width / 2;
    var cy = y !== undefined ? y : rect.top + rect.height / 2;
    var spreadX = x !== undefined ? 0 : rect.width / 2;
    var spreadY = x !== undefined ? 0 : rect.height / 2;

    for (var i = 0; i < count; i++) {
      var star = document.createElement('span');
      star.className = 'burst';
      var angle = Math.random() * Math.PI * 2;
      var dist = (x !== undefined ? 30 : 60) + Math.random() * 70;
      star.style.left = (cx + (Math.random() * 2 - 1) * spreadX * 0.9) + 'px';
      star.style.top = (cy + (Math.random() * 2 - 1) * spreadY * 0.7) + 'px';
      star.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      star.style.setProperty('--ty', (Math.sin(angle) * dist - 20).toFixed(1) + 'px');
      star.style.setProperty('--size', (Math.random() * 10 + 6).toFixed(0) + 'px');
      star.style.setProperty('--delay', (Math.random() * 260).toFixed(0) + 'ms');
      var heart = Math.random() < hearts;
      if (heart) star.classList.add('burst--heart');
      star.innerHTML = '<svg viewBox="0 0 20 20"><use href="#' + (heart ? 'ic-heart' : 'ic-spark') + '"/></svg>';
      document.body.appendChild(star);
      window.setTimeout(star.remove.bind(star), 1900);
    }
  }

  // Touch the card and it answers: stars, a few hearts, and a puff of wind
  // that pushes the nearby petals away.
  el.invite.addEventListener('pointerdown', function (event) {
    if (event.target.closest('a, button, input')) return;
    burst(el.invite, 10, event.clientX, event.clientY, 0.4);
    if (ambient) ambient.puff(event.clientX, event.clientY);
  });

  // On a mouse, a faint trail of gold dust follows the pointer.
  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion.matches) {
    var lastTrail = 0;
    el.invite.addEventListener('pointermove', function (event) {
      var now = performance.now();
      if (now - lastTrail < 38) return;
      lastTrail = now;
      var dot = document.createElement('span');
      dot.className = 'trail';
      dot.style.left = event.clientX + 'px';
      dot.style.top = event.clientY + 'px';
      dot.style.setProperty('--dx', (Math.random() * 24 - 12).toFixed(1) + 'px');
      dot.style.setProperty('--dy', (Math.random() * 18 + 8).toFixed(1) + 'px');
      document.body.appendChild(dot);
      window.setTimeout(dot.remove.bind(dot), 950);
    });
  }

  /* ── Dock ─────────────────────────────────────────────────────────────── */

  function showDock() {
    if (!el.dock) return;
    if (!('IntersectionObserver' in window)) { el.dock.classList.add('is-shown'); return; }
    // Stay out of the way on the invitation itself, and again once the guest
    // is already where the dock would take them.
    var limits = new Map([
      [hero, 0.35],
      [document.getElementById('rsvp'), 0.15],
      [document.querySelector('.finale'), 0.15]
    ]);
    var covering = new Map();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        covering.set(entry.target, entry.isIntersecting && entry.intersectionRatio > limits.get(entry.target));
      });
      var tucked = false;
      covering.forEach(function (v) { if (v) tucked = true; });
      el.dock.classList.toggle('is-tucked', tucked);
      el.dock.classList.add('is-shown');
    }, { threshold: [0, 0.15, 0.35, 0.6] });
    limits.forEach(function (limit, node) { if (node) observer.observe(node); });
  }

  /* ── Countdown ────────────────────────────────────────────────────────── */

  // 2 PM West Africa Time on the day of the traditional wedding.
  var WEDDING = Date.UTC(2026, 10, 19, 13, 0, 0);

  (function countdown() {
    var root = document.getElementById('countdown');
    var done = document.getElementById('countdownDone');
    if (!root) return;
    var units = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-unit]'), function (n) {
      units[n.getAttribute('data-unit')] = n;
    });

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function set(node, value) {
      if (node.textContent === value) return;
      node.textContent = value;
      node.classList.remove('is-ticking');
      void node.offsetWidth;
      node.classList.add('is-ticking');
    }

    function tick() {
      var diff = WEDDING - Date.now();
      if (diff <= 0) {
        root.hidden = true;
        done.hidden = false;
        return;
      }
      var s = Math.floor(diff / 1000);
      set(units.d, pad(Math.floor(s / 86400)));
      set(units.h, pad(Math.floor((s % 86400) / 3600)));
      set(units.m, pad(Math.floor((s % 3600) / 60)));
      set(units.s, pad(s % 60));
      window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  })();

  /* ── Add to calendar ──────────────────────────────────────────────────── */

  var EVENTS = {
    trad: {
      title: 'Zainab & Mmedaraobong: Traditional Wedding',
      start: '20261119T130000Z', end: '20261119T190000Z',
      location: 'Helemah Event Centre, 141 Aka Itiam Rd, Uyo',
      description: 'Traditional wedding of Zainab Ali and Mmedaraobong Joshua. RSVP 0703 129 9072.'
    },
    vows: {
      title: 'Zainab & Mmedaraobong: Vow Exchange & Blessings',
      start: '20261121T100000Z', end: '20261121T170000Z',
      location: 'Reception: Duellaz Landmark Event Centre, 37B Line Donald Etiebet Avenue, Ewet Housing Estate, Uyo',
      description: 'Vow exchange and blessings of Zainab Ali and Mmedaraobong Joshua. Reception follows immediately. RSVP 0703 129 9072.'
    }
  };

  function icsEscape(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function downloadIcs(key) {
    var e = EVENTS[key];
    if (!e) return;
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZM Wedding//Invitation//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + key + '-zm-2026@invitation',
      'DTSTAMP:' + stamp,
      'DTSTART:' + e.start,
      'DTEND:' + e.end,
      'SUMMARY:' + icsEscape(e.title),
      'LOCATION:' + icsEscape(e.location),
      'DESCRIPTION:' + icsEscape(e.description),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(e.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = key === 'trad' ? 'traditional-wedding.ics' : 'vow-exchange-and-blessings.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-ics]'), function (btn) {
    btn.addEventListener('click', function () {
      downloadIcs(btn.getAttribute('data-ics'));
      var r = btn.getBoundingClientRect();
      burst(btn, 8, r.left + r.width / 2, r.top + r.height / 2);
    });
  });

  /* ── Ambient: flowers on the wind ─────────────────────────────────────────
     Rose petals, small blossoms and the odd leaf ride a gusting wind across
     the screen at three depths, with gold dust drifting up through them.
     The same wind bends the florals printed on the card, so a gust visibly
     passes through both. Touch pushes the petals away; scrolling moves them
     at a rate set by their depth, so they sit in the air in front of the card.
     ────────────────────────────────────────────────────────────────────── */

  var ambient = null;
  var TAU = Math.PI * 2;

  function makeSprites() {
    var S = 96;
    var probe = document.createElement('canvas').getContext('2d');
    var canBlur = !!probe && 'filter' in probe;

    function blank() {
      var c = document.createElement('canvas');
      c.width = c.height = S;
      return c;
    }

    // Out-of-focus copy for the nearest and farthest layers.
    function soften(src) {
      if (!canBlur) return src;
      var c = blank();
      var x = c.getContext('2d');
      x.filter = 'blur(3px)';
      x.drawImage(src, 0, 0);
      return c;
    }

    // A rose petal: broad, a soft notch at the lip, narrowing to the base.
    function petal(base, body, lip) {
      var c = blank(), x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      x.beginPath();
      x.moveTo(0, 40);
      x.bezierCurveTo(-34, 26, -40, -16, -18, -34);
      x.bezierCurveTo(-10, -40, -4, -36, 0, -30);
      x.bezierCurveTo(4, -36, 10, -40, 18, -34);
      x.bezierCurveTo(40, -16, 34, 26, 0, 40);
      x.closePath();
      var g = x.createRadialGradient(0, 32, 2, 0, 0, 46);
      g.addColorStop(0, base);
      g.addColorStop(0.55, body);
      g.addColorStop(1, lip);
      x.fillStyle = g;
      x.fill();
      var light = x.createLinearGradient(-30, -30, 20, 30);
      light.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
      light.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      x.fillStyle = light;
      x.fill();
      x.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(0, 34);
      x.quadraticCurveTo(-4, 0, -2, -26);
      x.stroke();
      return c;
    }

    // Five-petalled blossom with a gold heart.
    function blossom(tip, heart) {
      var c = blank(), x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      for (var i = 0; i < 5; i++) {
        x.save();
        x.rotate(i * TAU / 5);
        x.beginPath();
        x.moveTo(0, 0);
        x.bezierCurveTo(-16, -10, -17, -33, -5, -38);
        x.quadraticCurveTo(0, -33, 5, -38);
        x.bezierCurveTo(17, -33, 16, -10, 0, 0);
        var g = x.createLinearGradient(0, 0, 0, -38);
        g.addColorStop(0, heart[1]);
        g.addColorStop(0.35, tip[0]);
        g.addColorStop(1, tip[1]);
        x.fillStyle = g;
        x.fill();
        x.restore();
      }
      x.fillStyle = heart[0];
      for (var j = 0; j < 7; j++) {
        var a = j * TAU / 7;
        x.beginPath();
        x.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 1.8, 0, TAU);
        x.fill();
      }
      x.beginPath();
      x.arc(0, 0, 3.2, 0, TAU);
      x.fill();
      return c;
    }

    // A sage leaf, from the white-rose sprays on the printed cards.
    function leaf() {
      var c = blank(), x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      x.rotate(-0.45);
      x.beginPath();
      x.moveTo(0, 40);
      x.bezierCurveTo(-22, 16, -20, -22, 0, -41);
      x.bezierCurveTo(20, -22, 22, 16, 0, 40);
      var g = x.createLinearGradient(-20, 0, 20, 0);
      g.addColorStop(0, '#6F8E78');
      g.addColorStop(0.5, '#A7C0A6');
      g.addColorStop(1, '#7E9C84');
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = 'rgba(240, 248, 236, 0.55)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(0, 38);
      x.quadraticCurveTo(2, 0, 0, -38);
      x.stroke();
      return c;
    }

    // Gold dust: one soft glow, reused.
    function glow() {
      var c = document.createElement('canvas');
      c.width = c.height = 32;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255, 244, 205, 1)');
      g.addColorStop(0.3, 'rgba(240, 196, 110, 0.65)');
      g.addColorStop(1, 'rgba(232, 184, 92, 0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
      return c;
    }

    var kinds = [
      { weight: 26, img: petal('#4A0620', '#8E1438', '#B8395A') },   // burgundy
      { weight: 14, img: petal('#5E0B25', '#A51E45', '#D05A74') },   // wine red
      { weight: 20, img: petal('#C9737E', '#EDB3B2', '#FBE1DB') },   // blush
      { weight: 12, img: petal('#D8C3A8', '#F4E8D8', '#FFFBF3') },   // ivory
      { weight: 6,  img: petal('#B9853E', '#E8C680', '#FAEBC4') },   // champagne gold
      { weight: 10, weightClass: 'blossom', img: blossom(['#FFF7EE', '#F6D9D6'], ['#D4A041', '#FFF2D0']) },
      { weight: 6,  weightClass: 'blossom', img: blossom(['#F7D2D0', '#E8A2A6'], ['#B9853E', '#FFE9E2']) },
      { weight: 6,  weightClass: 'leaf', img: leaf() }
    ];
    var total = 0;
    kinds.forEach(function (k) { k.soft = soften(k.img); total += k.weight; });

    return {
      size: S,
      glow: glow(),
      pick: function () {
        var r = Math.random() * total;
        for (var i = 0; i < kinds.length; i++) {
          r -= kinds[i].weight;
          if (r <= 0) return kinds[i];
        }
        return kinds[0];
      }
    };
  }

  var spriteCache = null;
  function getSprites() { return spriteCache || (spriteCache = makeSprites()); }

  // Wax shards thrown off as the seal breaks.
  function shards(x, y, count) {
    if (reduceMotion.matches) return;
    for (var i = 0; i < count; i++) {
      var bit = document.createElement('span');
      bit.className = 'shard';
      var angle = Math.random() * Math.PI * 2;
      var dist = 40 + Math.random() * 90;
      bit.style.left = x + 'px';
      bit.style.top = y + 'px';
      bit.style.setProperty('--size', (Math.random() * 7 + 5).toFixed(0) + 'px');
      bit.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      bit.style.setProperty('--ty', (Math.sin(angle) * dist * 0.6 + 80 + Math.random() * 60).toFixed(0) + 'px');
      bit.style.setProperty('--rot', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      document.body.appendChild(bit);
      window.setTimeout(bit.remove.bind(bit), 1200);
    }
  }

  /* The flower burst: petals, blossoms and leaves explode out of the envelope
     until they cover the screen, then fall under their own weight and settle
     in a heap along the bottom edge, like UIKit Dynamics: a UIGravityBehavior
     at the standard 1,000 pt/s², per-item air resistance (petals float, leaves
     and blossoms drop faster), and a collision boundary with a little
     elasticity and friction. The heap rests a moment, then fades. The nearest
     pieces are large and out of focus, as if passing the lens. */
  function petalBurst(ox, oy) {
    if (reduceMotion.matches) return;
    var sprites = getSprites(), S = sprites.size;
    var canvas = document.createElement('canvas');
    canvas.className = 'bloom-burst';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var GRAVITY = 1000;                     // points per second², the UIKit default
    var count = Math.round(Math.min(560, Math.max(340, (w * h) / 1200)));
    var items = [];
    for (var i = 0; i < count; i++) {
      var near = Math.random() < 0.07;
      var z = near ? 2.6 + Math.random() * 1.2 : 0.55 + Math.random() * 1.9;
      var kind = sprites.pick();
      // Weight: how strongly gravity wins over the air. Petals are the lightest.
      var heavy = kind.weightClass === 'leaf' ? 0.85 : kind.weightClass === 'blossom' ? 0.7 : 0.5 + Math.random() * 0.15;
      var drag = 2.4 - heavy * 1.2 + Math.random() * 0.5;   // linear resistance, per second
      // Aim each piece at a spot on the screen, allowing for the fall it will
      // make on the way, so the burst covers the whole view before it drops.
      var tx = Math.random() * (w + 120) - 60;
      var ty = Math.random() * (h * 0.95) - h * 0.15;
      var sx = ox + (Math.random() - 0.5) * 50, sy = oy + (Math.random() - 0.5) * 30;
      var sag = (GRAVITY * heavy) / (drag * drag) * 0.55;
      items.push({
        kind: kind, z: z,
        size: (18 + Math.random() * 20) * z,
        x: sx, y: sy,
        vx: (tx - sx) * drag,
        vy: (ty - sag - sy) * drag,
        g: GRAVITY * heavy, drag: drag,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 9,
        flip: Math.random() * TAU, flipSpeed: 3 + Math.random() * 6,
        sway: Math.random() * TAU, swaySpeed: 1.5 + Math.random() * 2,
        floor: h - 6 - Math.random() * 46 * Math.min(1.4, z),   // a heap, not a line
        delay: Math.random() * 0.2,
        resting: false, restAt: 0,
        soft: z > 1.9 || z < 0.7
      });
    }
    items.sort(function (a, b) { return a.z - b.z; });   // near pieces draw last

    var start = null, last = null, settledAt = 0;
    function frame(now) {
      if (start === null) { start = now; last = now; }
      var t = (now - start) / 1000;
      var dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var moving = 0;
      for (var k = 0; k < items.length; k++) {
        var p = items[k];
        if (t < p.delay) continue;

        if (!p.resting) {
          moving++;
          // Gravity, air resistance, and the sideways flutter of a falling petal.
          p.sway += p.swaySpeed * dt;
          var flutter = Math.sin(p.sway) * 140 * (1 - p.g / GRAVITY);
          p.vx += (flutter - p.vx * p.drag) * dt;
          p.vy += (p.g - p.vy * p.drag) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          p.flip += p.flipSpeed * dt;
          p.spin *= Math.pow(0.6, dt);

          // Side walls keep the burst on screen.
          if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.3; }
          if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx) * 0.3; }

          // The floor: a soft bounce, friction, then rest.
          if (p.y >= p.floor && p.vy > 0) {
            p.y = p.floor;
            if (p.vy > 90) {
              p.vy = -p.vy * 0.22;            // elasticity
              p.vx *= 0.55;                   // friction
              p.spin *= 0.4;
            } else {
              p.resting = true;
              p.restAt = t;
              p.vx = p.vy = 0;
              p.flipRest = 0.35 + Math.random() * 0.3;   // lies nearly flat, seen edge-on
            }
          }
        } else {
          // Settle the tilt so it reads as lying on the ground.
          var target = p.flipRest * (Math.cos(p.flip) < 0 ? -1 : 1);
          p.flatX = p.flatX === undefined ? Math.cos(p.flip) : p.flatX + (target - p.flatX) * Math.min(1, dt * 6);
        }

        var fx = p.resting ? p.flatX : Math.cos(p.flip);
        var shade = 0.72 + 0.28 * Math.abs(fx);
        if (Math.abs(fx) < 0.14) fx = fx < 0 ? -0.14 : 0.14;
        var fade = settledAt ? Math.max(0, 1 - (t - settledAt - 1.8) / 1.4) : 1;
        var c = Math.cos(p.rot), sn = Math.sin(p.rot);
        var scale = (p.size / S) * dpr;
        ctx.setTransform(c * fx * scale, sn * fx * scale, -sn * scale, c * scale, p.x * dpr, p.y * dpr);
        ctx.globalAlpha = Math.min(1, (t - p.delay) * 6) * shade * fade;
        ctx.drawImage(p.soft ? p.kind.soft : p.kind.img, -S / 2, -S / 2);
      }

      // Once nearly everything has landed, the heap rests and then fades.
      if (!settledAt && (moving < items.length * 0.04 || t > 6)) settledAt = t;
      if (settledAt && t > settledAt + 3.3) {
        canvas.remove();
        if (ambient) ambient.flurry(10, 'top');
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function startAmbient() {
    if (ambient) return;
    var canvas = el.ambient;
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    // With Reduce Motion on (Settings, Accessibility, Motion on an iPhone) the
    // petals still drift, but few, slow and steady: no gusts, no bursts, no
    // response to scrolling or touch, and the florals on the card stay still.
    var calm = reduceMotion.matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sprites = getSprites();
    var S = sprites.size;

    var w = 0, h = 0;
    var time = 0, last = 0;
    var gust = 0, extra = 0;
    var flowers = [], motes = [];
    var scrollDelta = 0, lastScroll = window.scrollY;
    var running = true;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    function flower(p, where) {
      p = p || {};
      p.kind = sprites.pick();
      p.z = Math.random() * 0.85 + 0.4;                  // 0.4 far … 1.25 near
      p.size = (15 + Math.random() * 13) * p.z;
      if (where === 'scatter') {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      } else if (where === 'top') {
        p.x = Math.random() * w * 1.1 - w * 0.1;
        p.y = -30 - Math.random() * 80;
      } else {
        p.x = -30 - Math.random() * 90;
        p.y = Math.random() * h * 1.05 - h * 0.15;
      }
      p.vx = 0.8;
      p.vy = 0.3;
      p.rot = Math.random() * TAU;
      p.spin = (Math.random() - 0.5) * 0.05;
      p.flip = Math.random() * TAU;
      p.flipSpeed = 0.025 + Math.random() * 0.05;
      p.boost = 0;
      p.wob = Math.random() * TAU;
      p.alpha = Math.min(0.95, 0.5 + p.z * 0.4);
      p.soft = p.z < 0.6 || p.z > 1.14;
      p.temp = false;
      return p;
    }

    function mote(p, scatter) {
      p = p || {};
      p.x = Math.random() * w;
      p.y = scatter ? Math.random() * h : h + 12;
      p.r = Math.random() * 1.5 + 0.5;
      p.vy = -(Math.random() * 0.25 + 0.08);
      p.tw = Math.random() * TAU;
      p.tws = Math.random() * 0.03 + 0.012;
      return p;
    }

    resize();
    var area = w * h;
    var flowerCount = calm ? 9 : Math.round(Math.min(36, Math.max(14, area / 24000)));
    var moteCount = calm ? 10 : Math.round(Math.min(40, Math.max(16, area / 30000)));
    for (var i = 0; i < flowerCount; i++) flowers.push(flower(null, 'scatter'));
    for (var j = 0; j < moteCount; j++) motes.push(mote(null, true));

    // Florals on the card that lean with the wind.
    var benders = Array.prototype.slice.call(document.querySelectorAll('[data-bend]'));
    var bending = new Set();
    benders.forEach(function (b) {
      b.__phase = Math.random() * TAU;
      b.__sign = parseFloat(b.getAttribute('data-bend')) || 1;
    });
    if ('IntersectionObserver' in window) {
      var watch = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) bending.add(entry.target); else bending.delete(entry.target);
        });
      }, { rootMargin: '120px 0px' });
      benders.forEach(function (b) { watch.observe(b); });
    } else {
      benders.forEach(function (b) { bending.add(b); });
    }

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(3, (now - last) / 16.667) : 1;
      last = now;
      time += dt / 60;

      // A breeze most of the time, and every so often a proper gust.
      var n = 0.5 + 0.5 * (0.55 * Math.sin(time * 0.31) + 0.3 * Math.sin(time * 0.77 + 1.3) + 0.15 * Math.sin(time * 1.93 + 0.4));
      gust = calm ? 0 : Math.pow(Math.max(0, n), 2.4);
      extra *= Math.pow(0.975, dt);
      var windX = calm ? 0.3 : 0.7 + gust * 3.2 + extra;
      var windY = 0.12 + Math.sin(time * 0.5) * 0.12;

      var shift = calm ? 0 : Math.max(-140, Math.min(140, scrollDelta));
      scrollDelta = 0;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gold dust rising through the air.
      for (var m = 0; m < motes.length; m++) {
        var d = motes[m];
        d.y += d.vy * dt - shift * 0.08;
        d.x += windX * 0.3 * dt;
        d.tw += d.tws * dt;
        if (d.x > w + 12) d.x = -12;
        if (d.y < -16 || d.y > h + 40) mote(d, false);
        var size = d.r * 8;
        ctx.globalAlpha = 0.3 + (Math.sin(d.tw) + 1) * 0.3;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(sprites.glow, d.x - size / 2, d.y - size / 2, size, size);
      }

      // Flowers.
      for (var k = flowers.length - 1; k >= 0; k--) {
        var p = flowers[k];
        var targetVx = windX * (0.45 + p.z * 0.75) + Math.sin(p.wob) * 0.35;
        var targetVy = (0.22 + p.z * 0.32) + windY + Math.sin(p.wob * 1.7) * 0.45 * p.z;
        var ease = Math.min(1, 0.035 * dt);
        p.vx += (targetVx - p.vx) * ease;
        p.vy += (targetVy - p.vy) * ease;
        p.x += p.vx * dt;
        p.y += p.vy * dt - shift * (0.12 + 0.3 * p.z);
        p.wob += 0.022 * dt;
        p.boost *= Math.pow(0.96, dt);
        p.flip += (p.flipSpeed * (1 + gust * 2.5) + p.boost * 0.18) * dt;
        p.rot += (p.spin + gust * 0.012 + p.boost * 0.05) * dt;

        if (p.x > w + 60 || p.y > h + 60 || p.y < -h * 0.5 || p.x < -320) {
          if (p.temp) { flowers.splice(k, 1); continue; }
          flower(p, Math.random() < 0.3 ? 'top' : 'left');
        }

        var sx = Math.cos(p.flip);
        var shade = 0.7 + 0.3 * Math.abs(sx);             // the back of a petal is darker
        if (Math.abs(sx) < 0.14) sx = sx < 0 ? -0.14 : 0.14;
        var sy = 0.86 + 0.14 * Math.sin(p.flip * 0.7);
        var c = Math.cos(p.rot), s = Math.sin(p.rot);
        var scale = (p.size / S) * dpr;
        ctx.setTransform(c * sx * scale, s * sx * scale, -s * sy * scale, c * sy * scale, p.x * dpr, p.y * dpr);
        ctx.globalAlpha = p.alpha * shade;
        ctx.drawImage(p.soft ? p.kind.soft : p.kind.img, -S / 2, -S / 2);
      }
      ctx.globalAlpha = 1;

      // The printed florals lean into the same gust.
      if (!calm) bending.forEach(function (b) {
        var bend = b.__sign * (0.7 * Math.sin(time * 1.3 + b.__phase) + gust * 2.6 + extra * 0.6);
        b.style.setProperty('--bend', bend.toFixed(2));
      });

      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      scrollDelta += y - lastScroll;
      lastScroll = y;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      var wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) { last = 0; requestAnimationFrame(frame); }
    });

    ambient = {
      // A burst of extra flowers on a stronger gust; they are not recycled.
      flurry: function (count, from) {
        if (calm) return;
        for (var i = 0; i < count; i++) {
          var p = flower(null, from === 'top' ? 'top' : 'left');
          if (from !== 'top') { p.x = -20 - Math.random() * 260; p.y = Math.random() * h * 0.9; }
          p.temp = true;
          flowers.push(p);
        }
        extra += from === 'top' ? 1.4 : 2.8;
      },
      // A puff of air from a touch: nearby flowers are pushed away and spin.
      puff: function (x, y) {
        if (calm) return;
        extra += 0.5;
        flowers.forEach(function (p) {
          var dx = p.x - x, dy = p.y - y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > 220) return;
          var force = (1 - dist / 220) * 11;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          p.boost = 1;
        });
      }
    };

    canvas.classList.add('is-on');
    window.__zmPetals = { calm: calm, count: function () { return flowers.length; }, running: function () { return running; } };
    requestAnimationFrame(frame);
  }

  /* ── Music ─────────────────────────────────────────────────────────────
     Starts on the tap that opens the envelope (browsers only allow sound
     after a gesture), fades in to 40%, fades out before the end of the
     track and back in as it loops. Volume goes through a Web Audio gain
     node because iOS ignores audio.volume. Fades out when the tab is hidden
     and back in on return. The guest can mute it; that choice is kept.   */

  var music = (function () {
    var SRC = 'assets/audio/running-home-to-you.mp3';
    var LEVEL = 0.4, FADE_IN = 3, FADE_OUT = 4;
    var MUTE_KEY = 'zm-invite-muted';

    var button = document.getElementById('soundToggle');
    var hint = document.getElementById('soundHint');
    var audio = new Audio(SRC);
    audio.preload = 'auto';

    var ctx = null, gain = null, analyser = null, bins = null, fallbackTimer = null;
    var started = false, fadingOut = false;
    var muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (err) { /* no storage */ }

    function connect() {
      if (ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        gain = ctx.createGain();
        gain.gain.value = 0;
        ctx.createMediaElementSource(audio).connect(gain);
        gain.connect(ctx.destination);
        // Taps the signal after the gain, so the heart rests when muted.
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        gain.connect(analyser);
        bins = new Uint8Array(analyser.frequencyBinCount);
        if (button) button.classList.add('has-analyser');
      } catch (err) {
        ctx = null; gain = null;
        audio.volume = 0;
      }
    }

    // Glide the volume to `to` over `secs` seconds.
    function ramp(to, secs) {
      if (gain) {
        var t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(to, t + Math.max(0.05, secs));
        return;
      }
      window.clearInterval(fallbackTimer);
      var from = audio.volume, steps = Math.max(1, Math.round(secs * 20)), i = 0;
      fallbackTimer = window.setInterval(function () {
        i += 1;
        audio.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
        if (i >= steps) window.clearInterval(fallbackTimer);
      }, 50);
    }

    function play(fade) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      var attempt = audio.play();
      if (attempt && attempt.then) {
        attempt.then(function () { ramp(LEVEL, fade); render(); })
               .catch(function () { render(); });
      } else {
        ramp(LEVEL, fade);
      }
      render();
    }

    function pause(fade) {
      ramp(0, fade);
      window.setTimeout(function () { if (muted || document.hidden) audio.pause(); render(); }, fade * 1000 + 60);
    }

    // Drive the heart from the bass end of the spectrum.
    var beating = false, floor = 0;
    function beat() {
      if (!analyser || audio.paused || muted || document.hidden) {
        beating = false;
        if (button) button.style.setProperty('--beat', '0');
        return;
      }
      analyser.getByteFrequencyData(bins);
      var sum = 0;
      for (var i = 1; i < 12; i++) sum += bins[i];
      var energy = sum / (11 * 255);
      // Beat against a slow running average, so the heart swells on the
      // kicks and settles between them rather than sitting at full size.
      floor = floor ? floor * 0.96 + energy * 0.04 : energy;
      var pulse = Math.max(0, Math.min(1, 0.2 + (energy - floor) * 3.2));
      button.style.setProperty('--beat', pulse.toFixed(3));
      requestAnimationFrame(beat);
    }

    function render() {
      if (!button) return;
      var on = started && !muted && !audio.paused;
      if (on && analyser && !beating) { beating = true; requestAnimationFrame(beat); }
      button.classList.toggle('is-playing', on);
      button.setAttribute('aria-pressed', String(!muted));
      button.setAttribute('aria-label', muted ? 'Play music' : 'Mute music');
      if (hint) hint.textContent = muted ? 'Tap to play' : 'Tap to mute';
    }

    // Fade out ahead of the end, then loop back in with a fade.
    audio.addEventListener('timeupdate', function () {
      if (fadingOut || !audio.duration || muted) return;
      var left = audio.duration - audio.currentTime;
      if (left <= FADE_OUT) { fadingOut = true; ramp(0, left); }
    });
    audio.addEventListener('ended', function () {
      fadingOut = false;
      audio.currentTime = 0;
      if (!muted && !document.hidden) play(FADE_IN);
    });

    document.addEventListener('visibilitychange', function () {
      if (!started || muted) return;
      if (document.hidden) pause(0.6);
      else play(1.5);
    });

    if (button) {
      button.addEventListener('click', function () {
        muted = !muted;
        try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (err) { /* no storage */ }
        if (muted) pause(0.8);
        else { if (!started) { started = true; connect(); } play(1.2); }
        render();
        // Confirm the new state in words for a moment.
        button.classList.add('is-hinting');
        window.clearTimeout(button.__hintTimer);
        button.__hintTimer = window.setTimeout(function () { button.classList.remove('is-hinting'); }, 2200);
      });
    }

    return {
      // Called from the envelope tap, which counts as the user gesture.
      start: function () {
        if (button) {
          button.classList.add('is-shown');
          // Say what the heart does, briefly, once it has arrived.
          window.setTimeout(function () { button.classList.add('is-hinting'); }, 2400);
          window.setTimeout(function () { button.classList.remove('is-hinting'); }, 8400);
        }
        if (started) return;
        started = true;
        connect();
        if (!muted) play(FADE_IN);
        render();
      }
    };
  })();

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  // ?debug in the address shows a small panel for checking a phone.
  function debugPanel() {
    if (!/[?&]debug\b/.test(location.search)) return;
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;padding:8px 10px;border-radius:8px;' +
      'background:rgba(0,0,0,.78);color:#fff;font:12px/1.4 ui-monospace,monospace;pointer-events:none;white-space:pre';
    document.body.appendChild(box);
    var frames = 0;
    (function count() { frames++; requestAnimationFrame(count); })();
    window.setInterval(function () {
      var petals = window.__zmPetals;
      box.textContent =
        'fps            ' + frames + '\n' +
        'reduce motion  ' + reduceMotion.matches + '\n' +
        'petals         ' + (petals ? (petals.running() ? 'running' : 'paused') + ', ' + petals.count() + (petals.calm ? ', calm' : '') : 'off') + '\n' +
        'hidden tab     ' + document.hidden + '\n' +
        'screen         ' + innerWidth + 'x' + innerHeight + ' @' + devicePixelRatio;
      frames = 0;
    }, 1000);
  }

  // Always open at the top of the card, never at a remembered scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  (function init() {
    // Fetch the handwriting font now, while the guest reads the gate.
    window.Handwriting.load().catch(function () {});
    // Petals drift behind the gate and the envelope from the first second.
    startAmbient();
    debugPanel();
    attendChooser();

    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (err) { /* no storage */ }

    if (stored) {
      // Someone who has opened it before: fetch their note,
      // then go straight to the envelope.
      el.gate.hidden = true;
      askGate(stored, true)
        .then(function (reply) { applyGuest(reply.ok ? reply : { salutation: stored }); })
        .catch(function () { applyGuest({ salutation: stored }); })
        .then(showStage);
    } else {
      applyGuest(null);
      showGate();
    }
  })();
})();
