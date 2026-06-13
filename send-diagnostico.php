<?php
declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

$mailConfigPath = __DIR__ . DIRECTORY_SEPARATOR . 'mail-config.php';
$maxPayloadBytes = 16384;
$cooldownSeconds = 20;
$allowedHosts = [
    'agenciajv.com',
    'www.agenciajv.com',
];

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

$originUrl = sanitize_optional_url((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), 2048);
if ($originUrl !== '' && !url_host_allowed($originUrl, $allowedHosts)) {
    respond_error(403, 'origin_not_allowed', 'Não foi possível processar a solicitação.', $redirectAnchor);
}

$refererUrl = sanitize_optional_url((string) ($_SERVER['HTTP_REFERER'] ?? ''), 2048);
if ($refererUrl !== '' && !url_host_allowed($refererUrl, $allowedHosts)) {
    respond_error(403, 'origin_not_allowed', 'Não foi possível processar a solicitação.', $redirectAnchor);
}

$pageUrl = sanitize_optional_url((string) ($_POST['page_url'] ?? ''), 2048);
if ($pageUrl !== '' && !url_host_allowed($pageUrl, $allowedHosts)) {
    $pageUrl = '';
}
if ($pageUrl === '') {
    $pageUrl = $refererUrl;
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
$subject = 'Novo diagnóstico solicitado - JV Marketing Digital';

$mailSent = true;

try {
    $mailConfig = load_mail_config($mailConfigPath);
    send_smtp_message($mailConfig, $subject, $messageBody, $email);
} catch (Throwable $exception) {
    $mailSent = false;
    log_smtp_failure(
        $formOriginRaw,
        $redirectAnchor,
        $exception->getMessage(),
        isset($mailConfig) && is_array($mailConfig) ? $mailConfig : []
    );
}

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

function url_host_allowed(string $url, array $allowedHosts): bool
{
    $host = parse_url($url, PHP_URL_HOST);
    if (!is_string($host) || $host === '') {
        return false;
    }

    return in_array(strtolower($host), $allowedHosts, true);
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

function load_mail_config(string $configPath): array
{
    if (!is_file($configPath) || !is_readable($configPath)) {
        throw new RuntimeException('SMTP config file not found. Create mail-config.php from mail-config.example.php.');
    }

    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('SMTP config file must return an array.');
    }

    $requiredKeys = [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USERNAME',
        'SMTP_PASSWORD',
        'SMTP_FROM_EMAIL',
        'SMTP_FROM_NAME',
        'SMTP_TO_EMAIL',
    ];
    $normalizedConfig = [];

    foreach ($requiredKeys as $key) {
        if (!array_key_exists($key, $config)) {
            throw new RuntimeException(sprintf('Missing SMTP config key: %s.', $key));
        }

        if ($key === 'SMTP_PORT') {
            $port = filter_var(
                $config[$key],
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 1, 'max_range' => 65535]]
            );
            if ($port === false) {
                throw new RuntimeException('SMTP_PORT must be a valid TCP port.');
            }

            $normalizedConfig[$key] = $port;
            continue;
        }

        if (!is_string($config[$key])) {
            throw new RuntimeException(sprintf('SMTP config value must be a string: %s.', $key));
        }

        $value = $key === 'SMTP_PASSWORD' ? $config[$key] : trim($config[$key]);
        if ($value === '') {
            throw new RuntimeException(sprintf('SMTP config value cannot be empty: %s.', $key));
        }

        $normalizedConfig[$key] = $value;
    }

    foreach (['SMTP_USERNAME', 'SMTP_FROM_EMAIL', 'SMTP_TO_EMAIL'] as $emailKey) {
        if (filter_var($normalizedConfig[$emailKey], FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(sprintf('SMTP config email is invalid: %s.', $emailKey));
        }
    }

    return $normalizedConfig;
}

function send_smtp_message(array $config, string $subject, string $messageBody, string $replyToEmail): void
{
    $host = $config['SMTP_HOST'];
    $port = (int) $config['SMTP_PORT'];
    $remoteSocket = ($port === 465 ? 'ssl://' : '') . $host . ':' . $port;
    $context = stream_context_create(
        [
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
            ],
        ]
    );

    $socket = @stream_socket_client($remoteSocket, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $context);
    if (!is_resource($socket)) {
        throw new RuntimeException(sprintf('SMTP connection failed (%s): %s', (string) $errno, $errstr));
    }

    stream_set_timeout($socket, 20);

    try {
        smtp_expect_response($socket, [220], 'server greeting');

        $ehloHost = get_smtp_ehlo_host();
        $ehloResponse = smtp_send_command($socket, 'EHLO ' . $ehloHost, [250]);

        if ($port !== 465) {
            $supportsStartTls = smtp_response_contains($ehloResponse, 'STARTTLS');
            if ($port === 587 && !$supportsStartTls) {
                throw new RuntimeException('SMTP server does not advertise STARTTLS on port 587.');
            }

            if ($supportsStartTls) {
                if (!defined('STREAM_CRYPTO_METHOD_TLS_CLIENT')) {
                    throw new RuntimeException('TLS support is not available in this PHP environment.');
                }

                smtp_send_command($socket, 'STARTTLS', [220]);
                $cryptoEnabled = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if ($cryptoEnabled !== true) {
                    throw new RuntimeException('Unable to enable TLS encryption for SMTP.');
                }

                smtp_send_command($socket, 'EHLO ' . $ehloHost, [250]);
            }
        }

        smtp_send_command($socket, 'AUTH LOGIN', [334]);
        smtp_send_command($socket, base64_encode($config['SMTP_USERNAME']), [334]);
        smtp_send_command($socket, base64_encode($config['SMTP_PASSWORD']), [235]);
        smtp_send_command($socket, 'MAIL FROM:<' . $config['SMTP_FROM_EMAIL'] . '>', [250]);
        smtp_send_command($socket, 'RCPT TO:<' . $config['SMTP_TO_EMAIL'] . '>', [250, 251]);
        smtp_send_command($socket, 'DATA', [354]);

        $headers = [
            'Date: ' . date('r'),
            'Message-ID: <' . generate_message_id($config['SMTP_FROM_EMAIL']) . '>',
            'From: ' . format_mailbox_header($config['SMTP_FROM_EMAIL'], $config['SMTP_FROM_NAME']),
            'To: ' . $config['SMTP_TO_EMAIL'],
            'Reply-To: ' . $replyToEmail,
            'Subject: ' . encode_mail_subject($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $payload = implode("\r\n", $headers)
            . "\r\n\r\n"
            . smtp_escape_body($messageBody);

        smtp_write($socket, $payload . "\r\n.\r\n");
        smtp_expect_response($socket, [250], 'message payload');
        smtp_send_command($socket, 'QUIT', [221]);
    } finally {
        if (is_resource($socket)) {
            fclose($socket);
        }
    }
}

function smtp_send_command($socket, string $command, array $expectedCodes): array
{
    smtp_write($socket, $command . "\r\n");

    return smtp_expect_response($socket, $expectedCodes, $command);
}

function smtp_expect_response($socket, array $expectedCodes, string $context): array
{
    $response = smtp_read_response($socket);
    if (!in_array($response['code'], $expectedCodes, true)) {
        throw new RuntimeException(
            sprintf(
                'SMTP command failed during %s. Response %d: %s',
                $context,
                $response['code'],
                implode(' | ', $response['lines'])
            )
        );
    }

    return $response;
}

function smtp_read_response($socket): array
{
    $lines = [];

    while (!feof($socket)) {
        $line = fgets($socket, 515);
        if ($line === false) {
            $meta = stream_get_meta_data($socket);
            if (!empty($meta['timed_out'])) {
                throw new RuntimeException('Timed out while waiting for SMTP server response.');
            }

            throw new RuntimeException('SMTP connection closed while reading server response.');
        }

        $line = rtrim($line, "\r\n");
        $lines[] = $line;

        if (!preg_match('/^(\d{3})([ -])/', $line, $matches)) {
            throw new RuntimeException('Malformed SMTP response: ' . $line);
        }

        if ($matches[2] === ' ') {
            return [
                'code' => (int) $matches[1],
                'lines' => $lines,
            ];
        }
    }

    throw new RuntimeException('SMTP connection closed unexpectedly.');
}

function smtp_write($socket, string $payload): void
{
    $remaining = $payload;

    while ($remaining !== '') {
        $written = fwrite($socket, $remaining);
        if ($written === false || $written === 0) {
            throw new RuntimeException('Failed to write data to SMTP socket.');
        }

        $remaining = (string) substr($remaining, $written);
    }
}

function smtp_response_contains(array $response, string $needle): bool
{
    foreach ($response['lines'] as $line) {
        if (stripos($line, $needle) !== false) {
            return true;
        }
    }

    return false;
}

function smtp_escape_body(string $messageBody): string
{
    $normalizedBody = str_replace(["\r\n", "\r"], "\n", $messageBody);
    $lines = explode("\n", $normalizedBody);

    foreach ($lines as &$line) {
        if (isset($line[0]) && $line[0] === '.') {
            $line = '.' . $line;
        }
    }
    unset($line);

    return implode("\r\n", $lines);
}

function format_mailbox_header(string $email, string $name): string
{
    $trimmedName = trim($name);
    if ($trimmedName === '') {
        return $email;
    }

    return encode_mail_header_text($trimmedName) . ' <' . $email . '>';
}

function encode_mail_header_text(string $value): string
{
    return preg_match('/[^\x20-\x7E]/', $value) === 1
        ? '=?UTF-8?B?' . base64_encode($value) . '?='
        : $value;
}

function get_smtp_ehlo_host(): string
{
    $host = gethostname();
    if (!is_string($host) || $host === '') {
        return 'localhost';
    }

    $sanitizedHost = preg_replace('/[^A-Za-z0-9.-]/', '-', $host) ?? 'localhost';
    $sanitizedHost = trim($sanitizedHost, '-.');

    return $sanitizedHost !== '' ? $sanitizedHost : 'localhost';
}

function generate_message_id(string $fromEmail): string
{
    $domain = strstr($fromEmail, '@');
    $domain = is_string($domain) ? ltrim($domain, '@') : 'localhost';

    try {
        $localPart = bin2hex(random_bytes(16));
    } catch (Throwable $exception) {
        $localPart = str_replace('.', '', uniqid('smtp', true));
    }

    return $localPart . '@' . $domain;
}

function log_smtp_failure(string $formOrigin, string $anchor, string $details, array $mailConfig = []): void
{
    $to = isset($mailConfig['SMTP_TO_EMAIL']) ? (string) $mailConfig['SMTP_TO_EMAIL'] : 'unknown';
    $from = isset($mailConfig['SMTP_FROM_EMAIL']) ? (string) $mailConfig['SMTP_FROM_EMAIL'] : 'unknown';

    error_log(
        sprintf(
            '[send-diagnostico] SMTP send failed; to=%s; from=%s; origin=%s; anchor=%s; remote_addr=%s; details=%s',
            $to,
            $from,
            $formOrigin,
            $anchor,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $details
        )
    );
}

function encode_mail_subject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}
