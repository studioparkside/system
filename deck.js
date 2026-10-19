/* Studio Parkside system deck, v2 neutral shell.
   Live at https://system.studioparkside.co/deck.js. Pairs with the DECK
   block in parkside.css. Linked at the foot of a deck page. */

/* Deck. Every slide is one stop. Scrolling, the arrow keys, and the
   arrows inside each slide move one slide at a time. A wheel or
   trackpad gesture moves one slide and then waits for the gesture to
   finish, so a long scroll never skips past a slide. The index jumps to
   the first slide of a section. Live only on a wide, tall enough
   screen. Anywhere else the slides stay a plain run of cards.
   Preview boxes ([data-preview]) fill with the image boxes and swatches
   from the section they name, so they follow the boards. */
(function () {
  var deck = document.querySelector('[data-deck]');
  if (!deck) return;
  var index = deck.querySelector('.deck-index');
  var track = deck.querySelector('.deck-track');
  var chapters = [].slice.call(deck.querySelectorAll('.deck-chapter')).map(function (el) {
    return { el: el, id: el.id, slides: [].slice.call(el.querySelectorAll('.deck-slide')), at: 0 };
  });
  var flat = [];
  chapters.forEach(function (ch, c) {
    ch.first = flat.length;
    ch.slides.forEach(function (s, i) { flat.push({ c: c, i: i, s: s }); });
  });

  // Previews, built from the boards before any ids move.
  [].slice.call(deck.querySelectorAll('[data-preview]')).forEach(function (box) {
    var src = document.getElementById(box.getAttribute('data-preview'));
    if (!src) return;
    var grid = box.querySelector('.slide-preview-grid'), sw = box.querySelector('.slide-preview-swatches');
    [].slice.call(src.querySelectorAll('.slide-visual .slide-img:not(.slide-swatch)')).slice(0, 6).forEach(function (img) {
      grid.appendChild(img.cloneNode(true));
    });
    [].slice.call(src.querySelectorAll('.slide-img.slide-swatch')).forEach(function (s) { sw.appendChild(s.cloneNode(true)); });
  });

  function btn(label, glyph, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'deck-btn' + (cls ? ' ' + cls : '');
    b.setAttribute('aria-label', label);
    b.innerHTML = glyph;
    return b;
  }

  // Index links, one per section, a pip per slide.
  var links = chapters.map(function (ch) {
    var a = document.createElement('a');
    a.href = '#' + ch.id;
    var pips = '';
    for (var k = 0; k < ch.slides.length; k++) pips += '<i></i>';
    a.innerHTML = '<span class="n">' + (ch.el.dataset.num || '') + '</span><span>' + ch.el.dataset.name + '</span>' +
      (ch.slides.length > 1 ? '<span class="deck-pips">' + pips + '</span>' : '');
    index.appendChild(a);
    return a;
  });
  var ctrl = document.createElement('div');
  ctrl.className = 'deck-ctrl';
  var up = btn('Previous section', '&#8593;'), down = btn('Next section', '&#8595;');
  ctrl.appendChild(up); ctrl.appendChild(down);
  index.appendChild(ctrl);

  // Arrows inside every slide.
  flat.forEach(function (f, g) {
    var nav = document.createElement('div');
    nav.className = 'slide-nav';
    var back = btn('Previous slide', '&#8592;', 'back'), fwd = btn('Next slide', '&#8594;');
    back.hidden = g === 0;
    fwd.hidden = g === flat.length - 1;
    back.addEventListener('click', function () { go(g - 1, true); });
    fwd.addEventListener('click', function () { go(g + 1, true); });
    nav.appendChild(back); nav.appendChild(fwd);
    f.s.appendChild(nav);
  });

  // One stop per slide.
  var stops = flat.map(function () {
    var s = document.createElement('div');
    s.className = 'deck-stop';
    track.appendChild(s);
    return s;
  });

  var mq = window.matchMedia('(min-width: 900px) and (min-height: 560px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var live = false, current = -1, frame = 0;

  function setLive(on) {
    live = on;
    deck.classList.toggle('is-live', on);
    chapters.forEach(function (ch) {
      var stop = stops[ch.first];
      if (on) { ch.el.removeAttribute('id'); stop.id = ch.id; }
      else { stop.removeAttribute('id'); ch.el.id = ch.id; ch.el.classList.remove('is-on', 'is-past'); }
      ch.slides.forEach(function (s) {
        if (!on) { s.removeAttribute('data-depth'); s.removeAttribute('aria-hidden'); s.inert = false; }
      });
    });
    current = -1;
    if (on) update();
  }

  function stageTop() { return parseFloat(getComputedStyle(deck.querySelector('.deck-stage')).top) || 0; }

  function position() {
    var stepH = stops.length > 1 ? stops[1].offsetTop - stops[0].offsetTop : 1;
    var p = (stageTop() - deck.getBoundingClientRect().top) / stepH;
    return Math.max(0, Math.min(flat.length - 1, Math.round(p)));
  }

  function paintChapter(c) {
    var ch = chapters[c];
    ch.slides.forEach(function (s, i) {
      var d = i - ch.at;
      s.dataset.depth = d < 0 ? 'past' : d > 2 ? 'far' : String(d);
      s.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      s.inert = d !== 0;
    });
    [].slice.call(links[c].querySelectorAll('.deck-pips i')).forEach(function (pip, k) {
      pip.classList.toggle('on', k <= ch.at);
    });
  }

  function render(g) {
    if (g === current) return;
    current = g;
    var f = flat[g];
    chapters.forEach(function (ch, k) {
      ch.el.classList.toggle('is-on', k === f.c);
      ch.el.classList.toggle('is-past', k < f.c);
    });
    links.forEach(function (a, k) {
      a.classList.toggle('on', k === f.c);
      if (k === f.c) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    chapters[f.c].at = f.i;
    paintChapter(f.c);
    up.disabled = f.c === 0;
    down.disabled = f.c === chapters.length - 1;
  }

  // A classic scrollbar takes width that 100vw counts. Measured so the
  // deck never pushes the page sideways. The index matches a slide.
  function measure() {
    deck.style.setProperty('--deck-sbw', (window.innerWidth - document.documentElement.clientWidth) + 'px');
    var h = live ? flat[0].s.offsetHeight : 0;
    if (h) deck.style.setProperty('--slide-h', h + 'px'); else deck.style.removeProperty('--slide-h');
  }
  function update() { frame = 0; measure(); if (live) render(position()); }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }

  function go(g, keepFocus) {
    g = Math.max(0, Math.min(flat.length - 1, g));
    var top = window.scrollY + stops[g].getBoundingClientRect().top - stageTop();
    window.scrollTo({ top: top, behavior: reduce.matches ? 'auto' : 'smooth' });
    if (keepFocus) {
      var nav = flat[g].s.querySelector('.slide-nav');
      var f = nav && nav.querySelector('.deck-btn:not([hidden]):not(.back)') || nav && nav.querySelector('.deck-btn:not([hidden])');
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 50);
    }
  }

  function inDeck() {
    var r = deck.getBoundingClientRect(), t = stageTop();
    return r.top <= t + 2 && r.bottom >= t + 40;
  }

  // Keys move one slide.
  document.addEventListener('keydown', function (e) {
    if (!live || e.metaKey || e.ctrlKey || e.altKey || !inDeck()) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    var g = position(), to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') to = g + 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') to = g - 1;
    if (to === null || to < 0 || to > flat.length - 1) return;
    e.preventDefault();
    go(to);
  });

  // The wheel moves one slide per gesture. A gesture ends after a short
  // pause, so trackpad momentum and a fast spin count as one move.
  var lastWheel = 0, lockUntil = 0, used = false;
  window.addEventListener('wheel', function (e) {
    if (!live || e.ctrlKey || !inDeck()) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    var g = position(), dir = e.deltaY > 0 ? 1 : -1;
    if ((dir < 0 && g === 0) || (dir > 0 && g === flat.length - 1)) return;
    e.preventDefault();
    var now = Date.now();
    if (now - lastWheel > 160) used = false;
    lastWheel = now;
    if (used || now < lockUntil || Math.abs(e.deltaY) < 4) return;
    used = true;
    lockUntil = now + 650;
    go(g + dir);
  }, { passive: false });

  // Links to a section, from the index or anywhere else, land on its first slide.
  function chapterOf(hash) {
    for (var k = 0; k < chapters.length; k++) if ('#' + chapters[k].id === hash) return k;
    return -1;
  }
  document.addEventListener('click', function (e) {
    var a = live && e.target.closest && e.target.closest('a[href^="#"]');
    var c = a ? chapterOf(a.getAttribute('href')) : -1;
    if (c < 0) return;
    e.preventDefault();
    go(chapters[c].first);
    try { history.replaceState(null, '', '#' + chapters[c].id); } catch (err) {}
  });
  up.addEventListener('click', function () { var c = flat[position()].c; go(chapters[Math.max(0, c - 1)].first); });
  down.addEventListener('click', function () { var c = flat[position()].c; go(chapters[Math.min(chapters.length - 1, c + 1)].first); });

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  function onMq() { setLive(mq.matches); }
  if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  window.addEventListener('beforeprint', function () { setLive(false); });
  window.addEventListener('afterprint', onMq);
  onMq();
  if (live && chapterOf(location.hash) > 0) {
    var startAt = chapters[chapterOf(location.hash)].first;
    requestAnimationFrame(function () {
      window.scrollTo({ top: window.scrollY + stops[startAt].getBoundingClientRect().top - stageTop(), behavior: 'instant' });
    });
  }
})();
