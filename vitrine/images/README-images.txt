=================================================================
IMAGES — Guide de remplacement des placeholders
=================================================================

Tous les fichiers actuels sont des PLACEHOLDERS (.svg) à remplacer
par vos vraies images. Recommandations de format et de poids pour
garder le site rapide sur mobile :

LOGO
  logo/logo-placeholder.svg     -> votre symbole rouge (SVG idéal, sinon PNG transparent)
  logo/favicon-placeholder.svg  -> icône d'onglet (SVG ou PNG 512x512)

HERO (grande photo d'accroche)
  hero/hero-placeholder.svg     -> photo paysage, ~1600x900 px
                                   Format JPG ou WebP, viser < 250 Ko

PORTFOLIO (grille de réalisations)
  portfolio/chantier-1.svg ... chantier-6.svg
                                   Photos ~800x600 px (ratio 4:3)
                                   JPG ou WebP, viser < 150 Ko chacune
                                   Idéal : couples avant/après

ICÔNES SERVICES
  icons/  -> actuellement des emojis dans le HTML. Vous pouvez y
             déposer des icônes SVG et remplacer les emojis si besoin.

-----------------------------------------------------------------
COMMENT REMPLACER
-----------------------------------------------------------------
Option 1 (simple) : gardez les mêmes NOMS de fichiers en changeant
  seulement l'extension vers .jpg, puis mettez à jour l'extension
  dans index.html (rechercher « .svg » dans les balises <img> et
  data-full du portfolio).

Option 2 : déposez vos .jpg/.webp et adaptez les chemins dans
  index.html en conséquence.

-----------------------------------------------------------------
OPTIMISATION (avant mise en ligne)
-----------------------------------------------------------------
- Compressez les photos : https://squoosh.app (gratuit) ou TinyPNG.
- Préférez le WebP quand c'est possible (plus léger que le JPG).
- Les images ont déjà loading="lazy" dans le HTML : elles ne se
  chargent qu'au défilement, ne pas retirer cet attribut.
