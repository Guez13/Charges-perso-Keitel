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
  var items = Array.prototype.slice.call(document.querySelectorAll('.portfolio-item'));
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

  items.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
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
     4. FALLBACK LAZY-LOADING
     Les images utilisent loading="lazy" (natif). Rien à faire
     pour les navigateurs récents ; ce bloc est laissé comme
     point d'extension si un polyfill devenait nécessaire.
     ------------------------------------------------------------- */

})();
