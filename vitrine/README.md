# Site vitrine Keitel — Maçonnerie & Rénovation (Aix-en-Provence)

Site vitrine **one-page** conçu comme une **machine à leads** : générer des
demandes de devis de particuliers dans le pays aixois.

- 100 % **HTML / CSS / JavaScript vanilla** (aucun build requis)
- **Responsive mobile-first**
- Formulaire de devis en **PHP natif** avec envoi par email (PHPMailer / SMTP OVH),
  **sans base de données**
- Compatible **hébergement mutualisé OVH**

---

## 📁 Arborescence

```
vitrine/
├── index.html              # La page (structure sémantique + SEO)
├── .htaccess               # Cache, compression, sécurité, protection config
├── README.md               # Ce fichier
├── css/
│   └── style.css           # Styles (variables couleur en haut = design final)
├── js/
│   ├── main.js             # Menu mobile, ancres, lightbox portfolio
│   └── form.js             # Validation client + envoi AJAX du formulaire
├── php/
│   ├── config.php          # ⚙️ SEUL fichier à éditer (email + SMTP)
│   ├── send-devis.php      # Traitement du formulaire + envoi email
│   └── PHPMailer/          # Librairie d'envoi (à installer, voir ci-dessous)
└── images/
    ├── logo/               # Logo + favicon (placeholders)
    ├── hero/               # Photo d'accroche (placeholder)
    ├── portfolio/          # Photos de chantiers (placeholders)
    ├── icons/              # Icônes services
    └── README-images.txt   # Guide de remplacement des images
```

---

## ⚙️ 1. Configurer l'adresse email du formulaire

Tout se passe dans **`php/config.php`** — c'est le seul fichier à modifier.

```php
'to_email'   => 'contact@keitel-renov.com',   // ← où arrivent les demandes
'from_email' => 'no-reply@keitel-renov.com',  // ← adresse OVH réelle (voir note)
'method'     => 'smtp',                        // 'smtp' (recommandé) ou 'mail'
'smtp' => [
    'host'       => 'ssl0.ovh.net',
    'port'       => 587,
    'encryption' => 'tls',
    'username'   => 'no-reply@keitel-renov.com', // = une adresse email OVH
    'password'   => 'VOTRE_MOT_DE_PASSE_EMAIL',  // mot de passe de cette adresse
],
```

> **Important (délivrabilité OVH)** : l'adresse `from_email` **doit être une
> vraie boîte email créée sur votre domaine OVH**. Un envoi depuis une adresse
> externe (gmail, etc.) sera bloqué ou classé en spam (SPF/DKIM). Créez par
> exemple `no-reply@keitel-renov.com` dans votre espace client OVH, puis
> reportez ses identifiants ci-dessus.

### Où trouver les infos SMTP OVH
Espace client OVH → **Emails** → votre compte email → onglet **Configuration
IMAP/SMTP**. Valeurs habituelles sur mutualisé :
- Serveur SMTP : `ssl0.ovh.net`
- Port : `587` (STARTTLS → `encryption = tls`) ou `465` (SSL → `encryption = ssl`)
- Identifiant : l'adresse email complète
- Mot de passe : celui de la boîte email

---

## 📦 2. Installer PHPMailer (pour l'envoi SMTP)

Voir **`php/PHPMailer/INSTALLER-PHPMailer.txt`** (résumé) :

1. Télécharger PHPMailer : https://github.com/PHPMailer/PHPMailer/releases
   (archive « Source code (zip) »)
2. Copier le dossier `src/` de l'archive vers `php/PHPMailer/src/`, pour obtenir :
   ```
   php/PHPMailer/src/PHPMailer.php
   php/PHPMailer/src/SMTP.php
   php/PHPMailer/src/Exception.php
   ```

> Si PHPMailer n'est pas installé, le script **bascule automatiquement** sur la
> fonction `mail()` native pour que le formulaire fonctionne quand même
> (délivrabilité moindre). Pour ce mode, mettez `'method' => 'mail'` dans la
> config.

---

## 🚀 3. Déployer sur OVH (hébergement mutualisé)

1. **Personnaliser** avant mise en ligne :
   - `php/config.php` (email + SMTP)
   - Numéro de téléphone : rechercher `+33600000000` et `06 00 00 00 00` dans
     `index.html` et remplacer partout.
   - Email affiché : `contact@keitel-renov.com`
   - URL du site : `www.keitel-renov.com` (balises canonical, Open Graph, schema.org)
   - Mentions légales du footer (SIRET, assurance décennale)
   - Remplacer les images placeholders (voir `images/README-images.txt`)

2. **Envoyer les fichiers** via l'espace OVH (FTP) :
   - Client FTP conseillé : **FileZilla**.
   - Identifiants FTP : espace client OVH → **Hébergements** → votre hébergement
     → onglet **FTP-SSH**.
   - Uploader **le contenu du dossier `vitrine/`** dans le dossier **`www/`**
     de votre hébergement (le `index.html` doit se retrouver à la racine de `www/`).

3. **Vérifier la version de PHP** : espace OVH → Hébergement → onglet **PHP** →
   choisir **PHP 8.x**.

4. **Activer le SSL (HTTPS)** : OVH fournit un certificat gratuit (Let's Encrypt).
   Une fois actif, décommenter le bloc « Forcer HTTPS » dans `.htaccess`.

5. **Tester le formulaire** : remplir et envoyer une demande, vérifier la
   réception de l'email. En cas d'échec, consulter les logs PHP (OVH →
   Hébergement → **Logs**) ; les erreurs d'envoi y sont tracées
   (`[Keitel devis] Échec envoi : ...`).

---

## 🎨 4. Habillage / design final (plus tard)

Le design est volontairement **neutre et sobre**, prêt à être habillé :

- Les **couleurs** sont centralisées en haut de `css/style.css` dans le bloc
  `:root { --accent: ... }`. Modifier ces variables suffit à appliquer
  l'identité visuelle (rouge du logo, etc.).
- La **typographie** utilise la police système par défaut (variable `--font`) —
  à remplacer par la police définitive ensuite.
- Le **logo** et les **photos** sont des placeholders identifiés.

---

## ⚡ 5. Performances / minification (optionnel, pour la prod)

Le site fonctionne tel quel. Pour gagner quelques Ko en production, vous pouvez
générer des versions minifiées et les référencer dans `index.html` :

- CSS : https://cssminifier.com  → enregistrer en `css/style.min.css`
- JS : https://javascript-minifier.com → `js/main.min.js`, `js/form.min.js`

Puis remplacer les `<link>`/`<script>` correspondants. **Non obligatoire.**

---

## ✅ Récapitulatif « check-list avant mise en ligne »

- [ ] `php/config.php` renseigné (email + SMTP OVH)
- [ ] PHPMailer installé dans `php/PHPMailer/src/`
- [ ] Téléphone / email / URL remplacés dans `index.html`
- [ ] Mentions légales complétées (footer)
- [ ] Vraies photos + logo en place (dossier `images/`)
- [ ] PHP 8.x activé sur OVH
- [ ] HTTPS activé + forcé dans `.htaccess`
- [ ] Formulaire testé (email bien reçu)
```
