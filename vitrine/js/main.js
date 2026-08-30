/* =================================================================
   KEITEL — main.js
   Interactions générales : menu mobile, navigation par ancres,
   lightbox du portfolio, année du footer.
   Vanilla JS, aucune dépendance.
   ================================================================= */
(function () {
  'use strict';

  /* -------------------------------------------------------------
     1. MENU MOBILE (hamburger)
     ------------------------------------------------------------- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    // Referme le menu après un clic sur un lien d'ancre
    mainNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -------------------------------------------------------------
     2. ANNÉE COURANTE (footer)
     ------------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  /* -------------------------------------------------------------
     3. LIGHTBOX PORTFOLIO
     Ouvre l'image en grand, navigation précédent/suivant,
     fermeture au clic sur le fond / croix / touche Échap.
     ------------------------------------------------------------- */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCaption = document.getElementById('lightbox-caption');
  var lbClose = document.getElementById('lightbox-close');
  var lbPrev = document.getElementById('lightbox-prev');
  var lbNext = document.getElementById('lightbox-next');
  // Lightbox : uniquement les photos simples (pas les comparateurs avant/après)
  var items = Array.prototype.slice.call(document.querySelectorAll('.portfolio-item:not(.ba-item)'));
  var currentIndex = 0;
  var lastFocused = null;

  function openLightbox(index) {
    if (!lightbox) return;
    currentIndex = index;
    var item = items[index];
    lbImg.src = item.getAttribute('data-full') || item.querySelector('img').src;
    lbImg.alt = item.getAttribute('data-caption') || '';
    lbCaption.textContent = item.getAttribute('data-caption') || '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // bloque le scroll de fond
    lastFocused = document.activeElement;
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) { lastFocused.focus(); }
  }

  function showRelative(step) {
    var next = (currentIndex + step + items.length) % items.length;
    openLightbox(next);
  }

  // Flag partagé : passe à true quand l'utilisateur fait glisser le
  // carrousel, pour empêcher l'ouverture de la lightbox après un drag.
  var suppressClick = false;

  items.forEach(function (item, i) {
    item.addEventListener('click', function () {
      if (suppressClick) { suppressClick = false; return; }
      openLightbox(i);
    });
  });

  if (lbClose) { lbClose.addEventListener('click', closeLightbox); }
  if (lbPrev) { lbPrev.addEventListener('click', function () { showRelative(-1); }); }
  if (lbNext) { lbNext.addEventListener('click', function () { showRelative(1); }); }

  if (lightbox) {
    // Clic sur le fond (hors image) = fermeture
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) { closeLightbox(); }
    });
    // Raccourcis clavier
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') { closeLightbox(); }
      else if (e.key === 'ArrowLeft') { showRelative(-1); }
      else if (e.key === 'ArrowRight') { showRelative(1); }
    });
  }

  /* -------------------------------------------------------------
     4. CARROUSEL PORTFOLIO
     - défile tout seul vers la droite quand la section entre dans
       l'écran (IntersectionObserver + requestAnimationFrame) ;
     - l'utilisateur peut faire glisser (souris) ou swiper (tactile)
       pour parcourir plus vite ; le défilement auto s'arrête dès
       qu'il interagit, et reprend quand la souris quitte la zone.
     ------------------------------------------------------------- */
  var carousel = document.getElementById('portfolio-carousel');
  if (carousel) {
    var autoOn = false;          // le défilement auto est-il actif ?
    var userPaused = false;      // l'utilisateur a-t-il pris la main ?
    var rafId = null;
    var SPEED = 0.6;             // pixels par frame (~36 px/s)

    // Respecte la préférence "réduire les animations"
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function maxScroll() { return carousel.scrollWidth - carousel.clientWidth; }

    function tick() {
      if (!autoOn || userPaused) { rafId = null; return; }
      if (carousel.scrollLeft >= maxScroll() - 1) {
        autoOn = false; rafId = null; return; // arrivé au bout : on s'arrête
      }
      carousel.scrollLeft += SPEED;
      rafId = requestAnimationFrame(tick);
    }

    function startAuto() {
      if (reduceMotion || userPaused || autoOn) return;
      if (maxScroll() <= 0) return;           // rien à défiler
      autoOn = true;
      if (!rafId) { rafId = requestAnimationFrame(tick); }
    }

    function stopAuto(permanent) {
      autoOn = false;
      if (permanent) { userPaused = true; }
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // Déclenche le défilement auto quand le carrousel entre dans l'écran
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { startAuto(); }
          else { autoOn = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
        });
      }, { threshold: 0.35 });
      io.observe(carousel);
    } else {
      startAuto(); // fallback navigateurs anciens
    }

    // L'utilisateur prend la main -> on coupe l'auto définitivement
    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      carousel.addEventListener(evt, function () { stopAuto(true); }, { passive: true });
    });

    /* --- Glisser-déposer à la souris (drag-to-scroll) --- */
    var isDown = false, startX = 0, startScroll = 0, moved = 0;

    carousel.addEventListener('pointerdown', function (e) {
      // Ne pas déclencher le défilement du carrousel si on manipule un
      // comparateur avant/après (il gère son propre glissement).
      if (e.target.closest('.ba')) { return; }
      isDown = true; moved = 0;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      carousel.classList.add('dragging');
      stopAuto(true);
    });

    carousel.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      carousel.scrollLeft = startScroll - dx;
      // Au-delà du seuil, on capture le pointeur pour un drag fluide
      if (moved > 6 && carousel.setPointerCapture) {
        try { carousel.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    function endDrag() {
      if (!isDown) return;
      isDown = false;
      carousel.classList.remove('dragging');
      // Si le pointeur a bougé, on empêche le clic (ouverture lightbox)
      if (moved > 6) { suppressClick = true; }
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
    carousel.addEventListener('pointerleave', endDrag);
  }

  /* -------------------------------------------------------------
     5. COMPARATEUR AVANT / APRÈS (curseur à glisser)
     Chaque .ba affiche deux images superposées ; la position du
     curseur (--pos) rogne l'image « avant » pour révéler l'« après ».
     Fonctionne à la souris, au doigt et au clic n'importe où.
     ------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.ba'), function (ba) {
    var dragging = false;

    function setPos(clientX) {
      var rect = ba.getBoundingClientRect();
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      ba.style.setProperty('--pos', pct + '%');
    }

    ba.addEventListener('pointerdown', function (e) {
      dragging = true;
      ba.setPointerCapture && ba.setPointerCapture(e.pointerId);
      setPos(e.clientX);
      e.preventDefault();
    });
    ba.addEventListener('pointermove', function (e) {
      if (dragging) { setPos(e.clientX); e.preventDefault(); }
    });
    function stop() { dragging = false; }
    ba.addEventListener('pointerup', stop);
    ba.addEventListener('pointercancel', stop);

    // Accessibilité clavier : flèches gauche/droite quand le slider a le focus
    ba.setAttribute('tabindex', '0');
    ba.setAttribute('role', 'slider');
    ba.setAttribute('aria-label', 'Comparer avant / après');
    ba.addEventListener('keydown', function (e) {
      var cur = parseFloat(ba.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft')  { ba.style.setProperty('--pos', Math.max(0, cur - 5) + '%'); }
      if (e.key === 'ArrowRight') { ba.style.setProperty('--pos', Math.min(100, cur + 5) + '%'); }
    });
  });

  /* -------------------------------------------------------------
     6. DIAPORAMA DU HERO (fondu automatique entre les photos)
     ------------------------------------------------------------- */
  var slideshow = document.getElementById('hero-slideshow');
  if (slideshow) {
    var slides = slideshow.querySelectorAll('.hero-slide');
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (slides.length > 1 && !reduce) {
      var idx = 0;
      setInterval(function () {
        slides[idx].classList.remove('is-active');
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add('is-active');
      }, 2000);
    }
  }

  /* -------------------------------------------------------------
     7. FALLBACK LAZY-LOADING
     Les images utilisent loading="lazy" (natif). Rien à faire
     pour les navigateurs récents ; ce bloc est laissé comme
     point d'extension si un polyfill devenait nécessaire.
     ------------------------------------------------------------- */

})();
