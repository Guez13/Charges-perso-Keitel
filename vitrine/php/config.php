<?php
/**
 * =================================================================
 * KEITEL — config.php
 * SEUL fichier à éditer pour configurer l'envoi des demandes de devis.
 * =================================================================
 *
 * ⚠️  NE PAS committer ce fichier avec de vrais identifiants sur un
 *     dépôt public. Sur OVH, gardez-le uniquement sur le serveur.
 */

return [

    /* -------------------------------------------------------------
     * 1. DESTINATAIRE — où arrivent les demandes de devis
     * ----------------------------------------------------------- */
    // Adresse qui reçoit les demandes (celle que Keitel consulte)
    'to_email'    => 'contact.keitel@gmail.com',
    'to_name'     => 'Keitel',

    // Expéditeur affiché. Sur OVH, il DOIT s'agir d'une adresse
    // hébergée sur votre domaine (ex: no-reply@votre-domaine.fr),
    // sinon les mails partent en spam ou sont rejetés (SPF/DKIM).
    'from_email'  => 'no-reply@keitel-renov.com',
    'from_name'   => 'Site Keitel',

    // Préfixe du sujet de l'email reçu
    'subject'     => '[Devis site] Nouvelle demande',

    /* -------------------------------------------------------------
     * 2. MÉTHODE D'ENVOI
     *    'smtp'  = PHPMailer via SMTP OVH (RECOMMANDÉ, meilleure
     *              délivrabilité). Nécessite le dossier PHPMailer/
     *              et les identifiants ci-dessous.
     *    'mail'  = fonction mail() native (fallback simple, sans
     *              dépendance, mais souvent classé en spam sur OVH).
     * ----------------------------------------------------------- */
    'method'      => 'smtp',

    /* -------------------------------------------------------------
     * 3. PARAMÈTRES SMTP OVH (si method = 'smtp')
     *    Voir le README pour trouver ces valeurs dans votre espace
     *    client OVH (Emails > votre compte email).
     * ----------------------------------------------------------- */
    'smtp' => [
        'host'       => 'ssl0.ovh.net',   // serveur SMTP OVH mutualisé standard
        'port'       => 587,               // 587 (STARTTLS) ou 465 (SSL)
        'encryption' => 'tls',             // 'tls' pour 587, 'ssl' pour 465
        'username'   => 'no-reply@keitel-renov.com', // = une adresse email OVH réelle
        'password'   => 'MOT_DE_PASSE_A_CONFIGURER',   // mot de passe de cette adresse
    ],

    /* -------------------------------------------------------------
     * 4. UPLOAD PHOTO
     * ----------------------------------------------------------- */
    'upload' => [
        'max_size_mb'  => 5,
        'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp'],
    ],

    /* -------------------------------------------------------------
     * 5. ANTI-SPAM
     * ----------------------------------------------------------- */
    // Délai minimal (secondes) entre l'affichage et l'envoi du
    // formulaire. En-dessous = probablement un bot.
    'min_seconds' => 3,
];
