<?php
/**
 * =================================================================
 * KEITEL — send-devis.php
 * Traite le formulaire de devis :
 *   - vérifie l'anti-spam (honeypot + délai)
 *   - valide les champs côté serveur
 *   - gère l'upload photo optionnel
 *   - envoie l'email via PHPMailer/SMTP (ou mail() en fallback)
 *   - répond en JSON (le JS affiche le message)
 *
 * Aucune base de données. Configuration dans config.php.
 * =================================================================
 */

// ---- Réponse toujours en JSON ----
header('Content-Type: application/json; charset=utf-8');

/**
 * Renvoie une réponse JSON et arrête le script.
 */
function respond($ok, $message, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---- Seules les requêtes POST sont acceptées ----
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Méthode non autorisée.', 405);
}

// ---- Chargement de la config ----
$config = require __DIR__ . '/config.php';

/* =================================================================
   1. ANTI-SPAM
   ================================================================= */

// Honeypot : ce champ doit rester vide (invisible pour les humains).
if (!empty($_POST['website'])) {
    // On répond "ok" pour ne pas informer le bot que le piège a fonctionné.
    respond(true, 'Votre demande a bien été envoyée.');
}

// Délai minimal de remplissage
if (!empty($_POST['form_start'])) {
    $elapsed = (time() * 1000 - (int) $_POST['form_start']) / 1000;
    if ($elapsed < $config['min_seconds']) {
        respond(true, 'Votre demande a bien été envoyée.'); // piège silencieux
    }
}

/* =================================================================
   2. RÉCUPÉRATION + VALIDATION DES CHAMPS
   ================================================================= */

/** Nettoie une chaîne (trim + suppression des caractères de contrôle). */
function clean($value) {
    $value = is_string($value) ? trim($value) : '';
    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value);
}

$nom         = clean($_POST['nom'] ?? '');
$telephone   = clean($_POST['telephone'] ?? '');
$email       = clean($_POST['email'] ?? '');
$typeTravaux = clean($_POST['type_travaux'] ?? '');
$description = clean($_POST['description'] ?? '');
$consent     = !empty($_POST['consent']);

$errors = [];

if ($nom === '' || mb_strlen($nom) > 80) {
    $errors[] = 'Nom invalide.';
}
$phoneDigits = preg_replace('/[^0-9]/', '', $telephone);
if (strlen($phoneDigits) < 6 || strlen($phoneDigits) > 15) {
    $errors[] = 'Téléphone invalide.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Email invalide.';
}
if ($typeTravaux === '') {
    $errors[] = 'Type de travaux manquant.';
}
if ($description === '' || mb_strlen($description) > 2000) {
    $errors[] = 'Description invalide.';
}
if (!$consent) {
    $errors[] = 'Consentement requis.';
}

if (!empty($errors)) {
    respond(false, 'Formulaire invalide : ' . implode(' ', $errors), 422);
}

/* =================================================================
   3. UPLOAD PHOTO (optionnel)
   ================================================================= */
$attachmentPath = null;
$attachmentName = null;

if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $file    = $_FILES['photo'];
    $maxSize = $config['upload']['max_size_mb'] * 1024 * 1024;

    if ($file['size'] > $maxSize) {
        respond(false, 'Photo trop lourde (max ' . $config['upload']['max_size_mb'] . ' Mo).', 422);
    }

    // Vérifie le vrai type MIME (pas seulement l'extension)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $config['upload']['allowed_mime'], true)) {
        respond(false, 'Format de photo non accepté (JPG, PNG ou WebP).', 422);
    }

    $attachmentPath = $file['tmp_name'];
    // Nom de fichier propre pour la pièce jointe
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
    $attachmentName = 'photo-chantier.' . $ext;
}

/* =================================================================
   4. CONSTRUCTION DU MESSAGE
   ================================================================= */
$sujet = $config['subject'] . ' — ' . $typeTravaux;

$corps  = "Nouvelle demande de devis depuis le site Keitel\n";
$corps .= "------------------------------------------------\n\n";
$corps .= "Nom / prénom : " . $nom . "\n";
$corps .= "Téléphone    : " . $telephone . "\n";
$corps .= "Email        : " . $email . "\n";
$corps .= "Type travaux : " . $typeTravaux . "\n\n";
$corps .= "Description :\n" . $description . "\n\n";
$corps .= "------------------------------------------------\n";
$corps .= "Reçu le " . date('d/m/Y à H:i') . "\n";
$corps .= "IP : " . ($_SERVER['REMOTE_ADDR'] ?? 'inconnue') . "\n";

/* =================================================================
   5. ENVOI
   ================================================================= */
$method = $config['method'] ?? 'mail';

// Tente PHPMailer si demandé ET disponible ; sinon bascule sur mail().
$phpmailerAvailable = file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php');

if ($method === 'smtp' && $phpmailerAvailable) {
    $sent = sendWithPhpMailer($config, $sujet, $corps, $nom, $email, $attachmentPath, $attachmentName);
} else {
    $sent = sendWithMail($config, $sujet, $corps, $email, $attachmentPath, $attachmentName);
}

if ($sent === true) {
    respond(true, 'Votre demande a bien été envoyée. Nous vous recontactons sous 48h.');
} else {
    // $sent contient le message d'erreur détaillé (log serveur)
    error_log('[Keitel devis] Échec envoi : ' . (is_string($sent) ? $sent : 'inconnu'));
    respond(false, "L'envoi a échoué. Merci de nous appeler ou de réessayer plus tard.", 500);
}

/* =================================================================
   FONCTIONS D'ENVOI
   ================================================================= */

/**
 * Envoi via PHPMailer + SMTP (recommandé sur OVH).
 * @return true|string true si OK, sinon message d'erreur.
 */
function sendWithPhpMailer($config, $sujet, $corps, $nom, $emailClient, $attachmentPath, $attachmentName) {
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $config['smtp']['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['smtp']['username'];
        $mail->Password   = $config['smtp']['password'];
        $mail->SMTPSecure = $config['smtp']['encryption']; // 'tls' ou 'ssl'
        $mail->Port       = $config['smtp']['port'];
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($config['from_email'], $config['from_name']);
        $mail->addAddress($config['to_email'], $config['to_name']);
        // Répondre directement au client depuis la boîte mail
        $mail->addReplyTo($emailClient, $nom);

        $mail->Subject = $sujet;
        $mail->Body    = $corps;

        if ($attachmentPath && $attachmentName) {
            $mail->addAttachment($attachmentPath, $attachmentName);
        }

        $mail->send();
        return true;
    } catch (\Exception $e) {
        return $mail->ErrorInfo ?: $e->getMessage();
    }
}

/**
 * Envoi via mail() natif (fallback). Gère une pièce jointe simple
 * en construisant un message MIME multipart.
 * @return true|string
 */
function sendWithMail($config, $sujet, $corps, $emailClient, $attachmentPath, $attachmentName) {
    $to      = $config['to_email'];
    $from    = $config['from_email'];
    $subject = '=?UTF-8?B?' . base64_encode($sujet) . '?=';

    $headers  = 'From: ' . $config['from_name'] . ' <' . $from . '>' . "\r\n";
    $headers .= 'Reply-To: ' . $emailClient . "\r\n";
    $headers .= 'MIME-Version: 1.0' . "\r\n";

    if ($attachmentPath && $attachmentName && is_file($attachmentPath)) {
        // Message multipart avec pièce jointe
        $boundary = 'kb_' . md5(uniqid('', true));
        $headers .= 'Content-Type: multipart/mixed; boundary="' . $boundary . '"' . "\r\n";

        $fileData = chunk_split(base64_encode(file_get_contents($attachmentPath)));

        $body  = '--' . $boundary . "\r\n";
        $body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
        $body .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
        $body .= $corps . "\r\n\r\n";
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Type: application/octet-stream; name="' . $attachmentName . '"' . "\r\n";
        $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
        $body .= 'Content-Disposition: attachment; filename="' . $attachmentName . '"' . "\r\n\r\n";
        $body .= $fileData . "\r\n";
        $body .= '--' . $boundary . '--';
    } else {
        $headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
        $body = $corps;
    }

    $ok = @mail($to, $subject, $body, $headers);
    return $ok ? true : 'mail() a renvoyé false';
}
