<?php
require __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Si algo se rompe, no mostramos detalles al público
set_exception_handler(function ($e) {
    error_log($e->getMessage());
    responder(['error' => 'Error del servidor'], 500);
});

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

// Minúsculas, sin tildes, separado en palabras sueltas
function palabras($texto) {
    $texto = mb_strtolower($texto, 'UTF-8');
    $texto = strtr($texto, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
    preg_match_all('/[a-z0-9]+/', $texto, $m);
    return array_unique($m[0]);
}

function requiere_admin() {
    if (empty($_SESSION['admin'])) {
        responder(['error' => 'no autorizado'], 401);
    }
}

function campos($datos) {
    $c = [];
    foreach (['categoria', 'pregunta', 'respuesta', 'palabras_clave'] as $k) {
        $c[] = isset($datos[$k]) && is_string($datos[$k]) ? trim($datos[$k]) : '';
    }
    return $c;
}

$metodo = $_SERVER['REQUEST_METHOD'];
$ruta   = trim($_GET['ruta'] ?? '', '/');
$p      = explode('/', $ruta);
$datos  = json_decode(file_get_contents('php://input'), true);
if (!is_array($datos)) $datos = [];

// ---------- Chat público ----------
if ($ruta === 'preguntas' && $metodo === 'GET') {
    $grupos = [];
    foreach (db()->query('SELECT id, categoria, pregunta FROM faq ORDER BY orden') as $f) {
        $grupos[$f['categoria']][] = ['id' => (int)$f['id'], 'pregunta' => $f['pregunta']];
    }
    $salida = [];
    foreach ($grupos as $cat => $lista) {
        $salida[] = ['categoria' => (string)$cat, 'preguntas' => $lista];
    }
    responder($salida);
}

if ($ruta === 'chat' && $metodo === 'POST') {
    if (isset($datos['id'])) {
        $st = db()->prepare('SELECT respuesta FROM faq WHERE id = ?');
        $st->execute([(int)$datos['id']]);
        $f = $st->fetch();
        if ($f) responder(['respuesta' => $f['respuesta']]);
    }
    $mensaje  = isset($datos['mensaje']) && is_string($datos['mensaje']) ? $datos['mensaje'] : '';
    $escritas = palabras($mensaje);
    $mejor = null;
    $puntaje = 0;
    foreach (db()->query('SELECT respuesta, palabras_clave FROM faq') as $f) {
        $c = count(array_intersect($escritas, palabras($f['palabras_clave'])));
        if ($c > $puntaje) { $mejor = $f; $puntaje = $c; }
    }
    if ($mejor) responder(['respuesta' => $mejor['respuesta']]);
    responder(['respuesta' => 'No te entendí 😅 Prueba con otras palabras, por ejemplo: «arduino», «difícil» o «programación», o toca una de las preguntas de arriba.']);
}

// ---------- Admin del FAQ ----------
if ($p[0] === 'admin') {
    $accion = $p[1] ?? '';

    if ($accion === 'estado' && $metodo === 'GET') {
        responder(['admin' => !empty($_SESSION['admin'])]);
    }

    if ($accion === 'login' && $metodo === 'POST') {
        $clave = isset($datos['clave']) && is_string($datos['clave']) ? $datos['clave'] : '';
        if (hash_equals(ADMIN_PASSWORD, $clave)) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            responder(['ok' => true]);
        }
        usleep(700000); // frena a quien intenta adivinar la clave
        responder(['ok' => false], 401);
    }

    if ($accion === 'logout' && $metodo === 'POST') {
        $_SESSION = [];
        session_destroy();
        responder(['ok' => true]);
    }

    if ($accion === 'faq') {
        requiere_admin();
        $id = isset($p[2]) ? (int)$p[2] : 0;

        if ($metodo === 'GET' && !$id) {
            responder(db()->query('SELECT * FROM faq ORDER BY orden')->fetchAll());
        }

        if ($metodo === 'POST' && !$id) {
            [$c, $q, $r, $k] = campos($datos);
            if ($c === '' || $q === '' || $r === '') {
                responder(['error' => 'Faltan categoría, pregunta o respuesta'], 400);
            }
            $orden = (int)db()->query('SELECT COALESCE(MAX(orden), -1) + 1 FROM faq')->fetchColumn();
            db()->prepare('INSERT INTO faq (categoria, orden, pregunta, respuesta, palabras_clave) VALUES (?,?,?,?,?)')
                ->execute([$c, $orden, $q, $r, $k]);
            responder(['ok' => true]);
        }

        if ($metodo === 'PUT' && $id) {
            [$c, $q, $r, $k] = campos($datos);
            if ($c === '' || $q === '' || $r === '') {
                responder(['error' => 'Faltan categoría, pregunta o respuesta'], 400);
            }
            db()->prepare('UPDATE faq SET categoria=?, pregunta=?, respuesta=?, palabras_clave=? WHERE id=?')
                ->execute([$c, $q, $r, $k, $id]);
            responder(['ok' => true]);
        }

        if ($metodo === 'DELETE' && $id) {
            db()->prepare('DELETE FROM faq WHERE id=?')->execute([$id]);
            responder(['ok' => true]);
        }
    }
}

responder(['error' => 'No encontrado'], 404);