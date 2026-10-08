<?php
require __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();
header('Content-Type: application/json; charset=utf-8');
// Que ningún caché (navegador, servidor o CDN) guarde las respuestas de la API
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-LiteSpeed-Cache-Control: no-cache');

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Si algo se rompe, no mostramos detalles al público
set_exception_handler(function ($e) {
    error_log($e->getMessage());
    $salida = ['error' => 'Error del servidor'];
    // Solo para depurar: define('DEBUG', true); en config.php muestra el motivo real
    if (defined('DEBUG') && DEBUG) $salida['detalle'] = $e->getMessage();
    responder($salida, 500);
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

function ip_cliente() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    return $_SERVER['REMOTE_ADDR'] ?? '';
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
    responder(['sinRespuesta' => true, 'respuesta' => 'No te entendí 😅 Prueba con otras palabras, por ejemplo: «arduino», «difícil» o «programación», o toca una de las preguntas de arriba.']);
}

if ($ruta === 'sugerencia' && $metodo === 'POST') {
    $dato = function ($k, $max) use ($datos) {
        $v = isset($datos[$k]) && is_string($datos[$k]) ? trim($datos[$k]) : '';
        return mb_substr($v, 0, $max, 'UTF-8');
    };
    // Campo trampa: las personas no lo ven, los bots sí lo llenan
    if ($dato('web', 50) !== '') responder(['ok' => true]);

    $texto = $dato('texto', 600);
    $largo = mb_strlen($texto, 'UTF-8');
    if ($largo < 5 || $largo > 500) {
        responder(['error' => 'Escribe tu pregunta (entre 5 y 500 caracteres).'], 400);
    }
    $tema   = $dato('tema', 80);
    $nombre = $dato('nombre', 80);
    $grado  = $dato('grado', 10);

    // Freno anti-spam: máximo 10 sugerencias cada 10 minutos por conexión (se guarda solo un código, no la IP)
    $ip = hash('sha256', ip_cliente() . DB_NAME);
    $st = db()->prepare('SELECT COUNT(*) FROM sugerencias WHERE ip_hash = ? AND creado > (NOW() - INTERVAL 10 MINUTE)');
    $st->execute([$ip]);
    if ((int)$st->fetchColumn() >= 10) {
        responder(['error' => 'Enviaste varias sugerencias seguidas. Intenta de nuevo más tarde.'], 429);
    }
    db()->prepare('INSERT INTO sugerencias (texto, tema, nombre, grado, ip_hash) VALUES (?, ?, ?, ?, ?)')
        ->execute([$texto, $tema ?: null, $nombre ?: null, $grado ?: null, $ip]);
    responder(['ok' => true]);
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

    if ($accion === 'sugerencias') {
        requiere_admin();
        $id = isset($p[2]) ? (int)$p[2] : 0;

        if ($metodo === 'GET' && !$id) {
            responder(db()->query('SELECT id, texto, tema, nombre, grado, leida, creado FROM sugerencias ORDER BY leida ASC, creado DESC')->fetchAll());
        }
        if ($metodo === 'PUT' && $id) {
            $leida = !empty($datos['leida']) ? 1 : 0;
            db()->prepare('UPDATE sugerencias SET leida = ? WHERE id = ?')->execute([$leida, $id]);
            responder(['ok' => true]);
        }
        if ($metodo === 'DELETE' && $id) {
            db()->prepare('DELETE FROM sugerencias WHERE id = ?')->execute([$id]);
            responder(['ok' => true]);
        }
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