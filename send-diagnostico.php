<?php
declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

$to = 'comercial@agenciajv.com';
$from = 'site@agenciajv.com';
$maxPayloadBytes = 16384;
$cooldownSeconds = 20;

$allowedFormOrigins = [
    'hero' => 'Hero',
    'final_cta' => 'Final CTA',
];

$allowedAnchors = [
    'hero' => 'inicio',
    'final_cta' => 'contato',
];

$allowedRevenues = [
    'ate_30_mil' => 'Até R$ 30 mil',
    'de_30_mil_a_100_mil' => 'De R$ 30 mil a R$ 100 mil',
    'de_100_mil_a_500_mil' => 'De R$ 100 mil a R$ 500 mil',
    'acima_500_mil' => 'Acima de R$ 500 mil',
];

$allowedInvestments = [
    'ainda_nao_invisto' => 'Ainda não invisto',
    'ate_3_mil' => 'Até R$ 3 mil',
    'de_3_mil_a_10_mil' => 'De R$ 3 mil a R$ 10 mil',
    'acima_10_mil' => 'Acima de R$ 10 mil',
];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    respond_error(405, 'method_not_allowed', 'Não foi possível processar a solicitação.', 'contato', false);
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > $maxPayloadBytes) {
    respond_error(413, 'payload_too_large', 'Não foi possível enviar agora. Tente novamente.', 'contato');
}

if ($contentLength > 0 && empty($_POST)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', 'contato');
}

$formOriginRaw = (string) ($_POST['form_origin'] ?? '');
$redirectAnchor = get_redirect_anchor($formOriginRaw, $allowedAnchors);

$honeypot = clean_text((string) ($_POST['company_site'] ?? ''));
if ($honeypot !== '') {
    respond_success($redirectAnchor);
}

if (!array_key_exists($formOriginRaw, $allowedFormOrigins)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$emailRaw = (string) ($_POST['email'] ?? '');
if ($emailRaw === '' || has_header_injection($emailRaw)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$email = trim($emailRaw);
if (text_length($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$phoneRaw = (string) ($_POST['phone'] ?? '');
if ($phoneRaw === '' || has_header_injection($phoneRaw) || text_length($phoneRaw) > 40) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$phone = clean_text($phoneRaw);
$phoneDigits = normalize_digits($phone);
if (!preg_match('/^\d{10,11}$/', $phoneDigits)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$revenueKey = clean_text((string) ($_POST['revenue'] ?? ''));
if (!array_key_exists($revenueKey, $allowedRevenues)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$investmentKey = clean_text((string) ($_POST['investment'] ?? ''));
if (!array_key_exists($investmentKey, $allowedInvestments)) {
    respond_error(400, 'validation_error', 'Revise os dados informados.', $redirectAnchor);
}

$pageUrl = sanitize_optional_url((string) ($_POST['page_url'] ?? ''), 2048);
if ($pageUrl === '') {
    $pageUrl = sanitize_optional_url((string) ($_SERVER['HTTP_REFERER'] ?? ''), 2048);
}
$utmValues = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $utmField) {
    $utmValues[$utmField] = sanitize_optional_text((string) ($_POST[$utmField] ?? ''), 150);
}

if (!start_rate_limit_session()) {
    respond_error(500, 'session_error', 'Não foi possível enviar agora. Tente novamente.', $redirectAnchor);
}

if (is_rate_limited($cooldownSeconds)) {
    respond_error(429, 'rate_limited', 'Aguarde alguns instantes antes de tentar novamente.', $redirectAnchor);
}

$ipAddress = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ?: 'indisponível';
$submittedAt = date('d/m/Y H:i:s');

$lines = [
    'Novo diagnóstico solicitado - JV Marketing Digital',
    '',
    'Origem do formulário: ' . $allowedFormOrigins[$formOriginRaw],
    'E-mail: ' . $email,
    'Telefone: ' . $phone,
    'Faturamento mensal aproximado: ' . $allowedRevenues[$revenueKey],
    'Investimento atual em marketing/mês: ' . $allowedInvestments[$investmentKey],
    'Página de origem: ' . ($pageUrl !== '' ? $pageUrl : 'Não informada'),
    'Data e hora: ' . $submittedAt,
    'IP: ' . $ipAddress,
];

$availableUtms = [];
foreach ($utmValues as $utmField => $utmValue) {
    if ($utmValue === '') {
        continue;
    }

    $availableUtms[$utmField] = $utmValue;
}
if ($availableUtms !== []) {
    $lines[] = '';
    $lines[] = 'UTMs:';
    foreach ($availableUtms as $utmField => $utmValue) {
        $lines[] = sprintf('%s: %s', format_utm_label($utmField), $utmValue);
    }
}

$messageBody = implode("\r\n", $lines);
$headers = [
    'From: JV Marketing Digital <' . $from . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

// mail() só confirma a aceitação pelo sistema de envio local. Se a entregabilidade
// na HostGator for insuficiente, o próximo passo recomendado é SMTP autenticado.
$mailSent = function_exists('mail')
    ? mail(
        $to,
        encode_mail_subject('Novo diagnóstico solicitado - JV Marketing Digital'),
        $messageBody,
        implode("\r\n", $headers)
    )
    : false;

if (!$mailSent) {
    respond_error(503, 'mail_error', 'Não foi possível enviar agora. Tente novamente.', $redirectAnchor);
}

$_SESSION['diagnostico_last_submit_at'] = time();
respond_success($redirectAnchor);

function clean_text(string $value): string
{
    $value = str_replace("\0", '', $value);
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? $value;
    $value = preg_replace('/\s{2,}/u', ' ', $value) ?? $value;

    return trim($value);
}

function text_length(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    return strlen($value);
}

function has_header_injection(string $value): bool
{
    return preg_match('/[\r\n]|%0a|%0d/i', $value) === 1;
}

function normalize_digits(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function wants_json_response(): bool
{
    $acceptHeader = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = trim($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');

    return stripos($acceptHeader, 'application/json') !== false
        || strcasecmp($requestedWith, 'XMLHttpRequest') === 0;
}

function respond_success(string $anchor): void
{
    if (wants_json_response()) {
        http_response_code(200);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store, max-age=0');
        echo json_encode(
            [
                'ok' => true,
                'message' => 'Solicitação enviada com sucesso.',
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        exit;
    }

    header('Location: ./index.html?status=success#' . rawurlencode($anchor), true, 303);
    exit;
}

function respond_error(
    int $statusCode,
    string $code,
    string $message,
    string $anchor,
    bool $allowFallback = true
): void {
    if (wants_json_response()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store, max-age=0');
        echo json_encode(
            [
                'ok' => false,
                'code' => $code,
                'message' => $message,
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        exit;
    }

    if ($allowFallback) {
        header('Location: ./index.html?status=error#' . rawurlencode($anchor), true, 303);
        exit;
    }

    http_response_code($statusCode);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $statusCode === 405
        ? 'Método não permitido.'
        : 'Não foi possível processar a solicitação.';
    exit;
}

function get_redirect_anchor(string $formOrigin, array $allowedAnchors): string
{
    return $allowedAnchors[$formOrigin] ?? 'contato';
}

function sanitize_optional_text(string $value, int $maxLength): string
{
    if ($value === '' || has_header_injection($value)) {
        return '';
    }

    $cleanValue = clean_text($value);
    if ($cleanValue === '' || text_length($cleanValue) > $maxLength) {
        return '';
    }

    return $cleanValue;
}

function sanitize_optional_url(string $value, int $maxLength): string
{
    $cleanValue = sanitize_optional_text($value, $maxLength);
    if ($cleanValue === '') {
        return '';
    }

    return filter_var($cleanValue, FILTER_VALIDATE_URL) !== false ? $cleanValue : '';
}

function start_rate_limit_session(): bool
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return true;
    }

    return session_start();
}

function is_rate_limited(int $cooldownSeconds): bool
{
    $lastSubmitAt = $_SESSION['diagnostico_last_submit_at'] ?? 0;
    if (!is_int($lastSubmitAt) && !ctype_digit((string) $lastSubmitAt)) {
        return false;
    }

    return time() - (int) $lastSubmitAt < $cooldownSeconds;
}

function format_utm_label(string $field): string
{
    switch ($field) {
        case 'utm_source':
            return 'UTM Source';
        case 'utm_medium':
            return 'UTM Medium';
        case 'utm_campaign':
            return 'UTM Campaign';
        case 'utm_content':
            return 'UTM Content';
        case 'utm_term':
            return 'UTM Term';
        default:
            return $field;
    }
}

function encode_mail_subject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}
