/* =================================================================
   KEITEL — form.js
   Validation côté client du formulaire de devis + envoi AJAX
   (fetch) vers php/send-devis.php. Affiche un message de
   confirmation sans recharger la page.

   La validation serveur (PHP) reste la référence : ce script
   améliore l'expérience mais ne remplace pas les contrôles PHP.
   ================================================================= */
(function () {
  'use strict';

  var form = document.getElementById('devis-form');
  if (!form) return;

  var feedback = document.getElementById('form-feedback');
  var submitBtn = document.getElementById('submit-btn');
  var formStart = document.getElementById('form_start');

  // Horodatage de chargement (anti-spam : soumission trop rapide = bot)
  if (formStart) { formStart.value = Date.now(); }

  var MAX_FILE_MB = 5;

  /* ---------- Helpers de validation ---------- */
  function setError(field, message) {
    var group = field.closest('.form-group');
    if (group) { group.classList.add('has-error'); }
    var errEl = form.querySelector('.field-error[data-for="' + field.name + '"]');
    if (errEl) { errEl.textContent = message; }
  }

  function clearError(field) {
    var group = field.closest('.form-group');
    if (group) { group.classList.remove('has-error'); }
    var errEl = form.querySelector('.field-error[data-for="' + field.name + '"]');
    if (errEl) { errEl.textContent = ''; }
  }

  function isValidEmail(value) {
    // Contrôle simple et permissif ; PHP fait la validation stricte.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhone(value) {
    var digits = value.replace(/[^0-9]/g, '');
    return digits.length >= 6 && digits.length <= 15;
  }

  /* ---------- Validation d'un champ ---------- */
  function validateField(field) {
    clearError(field);

    if (field.name === 'website') return true; // honeypot, ignoré côté client

    // Champs requis
    if (field.hasAttribute('required')) {
      if (field.type === 'checkbox' && !field.checked) {
        setError(field, 'Merci de cocher cette case.');
        return false;
      }
      if (field.type !== 'checkbox' && !field.value.trim()) {
        setError(field, 'Ce champ est obligatoire.');
        return false;
      }
    }

    if (field.name === 'email' && field.value && !isValidEmail(field.value)) {
      setError(field, 'Adresse email invalide.');
      return false;
    }

    if (field.name === 'telephone' && field.value && !isValidPhone(field.value)) {
      setError(field, 'Numéro de téléphone invalide.');
      return false;
    }

    if (field.name === 'photo' && field.files && field.files.length > 0) {
      var file = field.files[0];
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(field, 'Fichier trop lourd (max ' + MAX_FILE_MB + ' Mo).');
        return false;
      }
      var okTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (okTypes.indexOf(file.type) === -1) {
        setError(field, 'Format non accepté (JPG, PNG ou WebP).');
        return false;
      }
    }

    return true;
  }

  /* ---------- Validation à la volée (au blur) ---------- */
  var fields = form.querySelectorAll('input, select, textarea');
  Array.prototype.forEach.call(fields, function (field) {
    field.addEventListener('blur', function () { validateField(field); });
  });

  /* ---------- Affichage du feedback global ---------- */
  function showFeedback(type, message) {
    if (!feedback) return;
    feedback.className = 'form-feedback show ' + type;
    feedback.textContent = message;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Soumission ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Valide tous les champs
    var allValid = true;
    var firstInvalid = null;
    Array.prototype.forEach.call(fields, function (field) {
      if (!validateField(field)) {
        allValid = false;
        if (!firstInvalid) { firstInvalid = field; }
      }
    });

    if (!allValid) {
      showFeedback('error', 'Merci de corriger les champs indiqués.');
      if (firstInvalid) { firstInvalid.focus(); }
      return;
    }

    // Envoi AJAX
    var data = new FormData(form);
    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi en cours…';
    if (feedback) { feedback.className = 'form-feedback'; feedback.textContent = ''; }

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
      .then(function (json) {
        if (json && json.ok) {
          form.reset();
          if (formStart) { formStart.value = Date.now(); }
          showFeedback('success', json.message || 'Votre demande a bien été envoyée. Nous vous recontactons rapidement.');
        } else {
          showFeedback('error', (json && json.message) || "Une erreur est survenue. Merci de réessayer ou de nous appeler.");
        }
      })
      .catch(function () {
        showFeedback('error', "Impossible d'envoyer le formulaire. Vérifiez votre connexion ou appelez-nous.");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
  });

})();
