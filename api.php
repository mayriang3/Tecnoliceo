<?php
require __DIR__ . '/config.php';
date_default_timezone_set('UTC');

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

// ---------- Cuentas (estudiantes y profesores) ----------
function ahora($segundos = 0) { return date('Y-m-d H:i:s', time() + $segundos); }
function ip_hash() { return hash('sha256', ip_cliente() . DB_NAME); }

function fallos_recientes($tipo, $minutos = 10) {
    $st = db()->prepare('SELECT COUNT(*) FROM intentos WHERE ip_hash = ? AND tipo = ? AND creado > ?');
    $st->execute([ip_hash(), $tipo, ahora(-60 * $minutos)]);
    return (int)$st->fetchColumn();
}
function registrar_fallo($tipo) {
    db()->prepare('INSERT INTO intentos (ip_hash, tipo, creado) VALUES (?,?,?)')->execute([ip_hash(), $tipo, ahora()]);
    if (mt_rand(1, 50) === 1) {
        db()->prepare('DELETE FROM intentos WHERE creado < ?')->execute([ahora(-86400)]);
    }
}
function texto_campo($datos, $k, $max) {
    $v = isset($datos[$k]) && is_string($datos[$k]) ? trim($datos[$k]) : '';
    return mb_substr($v, 0, $max, 'UTF-8');
}
function usuario_valido($u) { return (bool)preg_match('/^[a-z0-9._-]{4,30}$/', $u); }
function clave_valida($c)   { return is_string($c) && strlen($c) >= 8 && strlen($c) <= 72; }
function codigo_aleatorio() {
    $letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0, O, 1, I para no confundir
    $c = '';
    for ($i = 0; $i < 8; $i++) $c .= $letras[random_int(0, strlen($letras) - 1)];
    return $c;
}
function usuario_actual() {
    if (empty($_SESSION['usuario_id'])) return null;
    $st = db()->prepare('SELECT u.id, u.nombre, u.usuario, u.rol, g.nombre AS grado FROM usuarios u LEFT JOIN grados g ON g.id = u.grado_id WHERE u.id = ?');
    $st->execute([(int)$_SESSION['usuario_id']]);
    $u = $st->fetch();
    if (!$u) { unset($_SESSION['usuario_id']); return null; } // la cuenta ya no existe
    return $u;
}
function iniciar_sesion($id) {
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int)$id;
}

function requiere_profesor() {
    $u = usuario_actual();
    if (!$u || $u['rol'] !== 'profesor') responder(['error' => 'no autorizado'], 401);
    return $u;
}

function ahora_bogota() {
    return (new DateTime('now', new DateTimeZone('America/Bogota')))->format('Y-m-d H:i:s');
}

// Acepta "2026-10-15T14:30" o "2026-10-15 14:30" y devuelve "2026-10-15 14:30:00" (o null si no es válida)
function fecha_limite_valida($v) {
    if (!is_string($v) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/', trim($v), $m)) return null;
    if (!checkdate((int)$m[2], (int)$m[3], (int)$m[1]) || (int)$m[4] > 23 || (int)$m[5] > 59) return null;
    return "$m[1]-$m[2]-$m[3] $m[4]:$m[5]:00";
}

function tarea_propia($id, $profId) {
    $st = db()->prepare('SELECT * FROM tareas WHERE id = ? AND profesor_id = ?');
    $st->execute([$id, $profId]);
    $t = $st->fetch();
    if (!$t) responder(['error' => 'Tarea no encontrada'], 404);
    return $t;
}

// Valida los datos de una tarea y devuelve [titulo, descripcion, materia_id, fecha, grados]
function leer_tarea($datos, $profId) {
    $titulo = texto_campo($datos, 'titulo', 150);
    if (mb_strlen($titulo, 'UTF-8') < 3) responder(['error' => 'Escribe un título (mínimo 3 caracteres).'], 400);
    $desc  = texto_campo($datos, 'descripcion', 2000);
    $fecha = fecha_limite_valida($datos['fecha_limite'] ?? null);
    if (!$fecha) responder(['error' => 'Elige una fecha y una hora límite válidas.'], 400);
    $mid = isset($datos['materia_id']) ? (int)$datos['materia_id'] : 0;
    $st = db()->prepare('SELECT 1 FROM profesor_materia WHERE profesor_id = ? AND materia_id = ?');
    $st->execute([$profId, $mid]);
    if (!$st->fetch()) responder(['error' => 'Elige una de tus materias.'], 400);
    $gr = isset($datos['grados']) && is_array($datos['grados']) ? array_values(array_unique(array_map('intval', $datos['grados']))) : [];
    if (!$gr) responder(['error' => 'Elige al menos un grado.'], 400);
    $st = db()->prepare('SELECT COUNT(*) FROM grados WHERE id IN (' . implode(',', array_fill(0, count($gr), '?')) . ')');
    $st->execute($gr);
    if ((int)$st->fetchColumn() !== count($gr)) responder(['error' => 'Algún grado no es válido.'], 400);
    return [$titulo, $desc, $mid, $fecha, $gr];
}

function guardar_grados_tarea($tareaId, $grados) {
    db()->prepare('DELETE FROM tarea_grados WHERE tarea_id = ?')->execute([$tareaId]);
    $ins = db()->prepare('INSERT INTO tarea_grados (tarea_id, grado_id) VALUES (?, ?)');
    foreach ($grados as $g) $ins->execute([$tareaId, $g]);
}

function requiere_gestion() {
    if (!empty($_SESSION['admin'])) return;
    $u = usuario_actual();
    if (!$u || !in_array($u['rol'], ['profesor', 'admin'], true)) {
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
if (in_array($metodo, ['POST', 'PUT', 'DELETE'], true) && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') === false) {
    responder(['error' => 'Solicitud no válida'], 415);
}

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

// ---------- Cuentas: registro, entrada y salida ----------
if ($p[0] === 'auth') {
    $accion = $p[1] ?? '';

    if ($accion === 'yo' && $metodo === 'GET') {
        $u = usuario_actual();
        responder($u
            ? ['autenticado' => true, 'nombre' => $u['nombre'], 'usuario' => $u['usuario'], 'rol' => $u['rol'], 'grado' => $u['grado']]
            : ['autenticado' => false]);
    }

    if ($accion === 'registro' && $metodo === 'POST') {
        if (fallos_recientes('registro') >= 10) {
            responder(['error' => 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'], 429);
        }
        $nombre  = texto_campo($datos, 'nombre', 100);
        $usuario = mb_strtolower(texto_campo($datos, 'usuario', 40), 'UTF-8');
        $clave   = isset($datos['clave']) && is_string($datos['clave']) ? $datos['clave'] : '';
        $codigo  = strtoupper(preg_replace('/\s+/', '', texto_campo($datos, 'codigo', 20)));

        if (mb_strlen($nombre, 'UTF-8') < 3) responder(['error' => 'Escribe tu nombre completo.'], 400);
        if (!usuario_valido($usuario)) {
            responder(['error' => 'El usuario debe tener de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.'], 400);
        }
        if (!clave_valida($clave)) responder(['error' => 'La clave debe tener entre 8 y 72 caracteres.'], 400);

        $st = db()->prepare('SELECT id FROM grados WHERE codigo = ? AND registro_activo = 1');
        $st->execute([$codigo]);
        $grado = $codigo === '' ? false : $st->fetch();
        if (!$grado) {
            registrar_fallo('registro');
            responder(['error' => 'El código de grado no es válido o el registro está cerrado.'], 403);
        }
        try {
            db()->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol, grado_id) VALUES (?,?,?,?,?)')
                ->execute([$nombre, $usuario, password_hash($clave, PASSWORD_DEFAULT), 'estudiante', $grado['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') responder(['error' => 'Ese usuario ya existe, elige otro.'], 409);
            throw $e;
        }
        iniciar_sesion((int)db()->lastInsertId());
        responder(['ok' => true, 'rol' => 'estudiante']);
    }

    if ($accion === 'login' && $metodo === 'POST') {
        if (fallos_recientes('login', 10) >= 30) {
            responder(['error' => 'Demasiados intentos desde esta conexión. Espera unos minutos.'], 429);
        }
        $usuario = mb_strtolower(texto_campo($datos, 'usuario', 40), 'UTF-8');
        $clave   = isset($datos['clave']) && is_string($datos['clave']) ? $datos['clave'] : '';

        $st = db()->prepare('SELECT id, password_hash, intentos, bloqueado_hasta FROM usuarios WHERE usuario = ?');
        $st->execute([$usuario]);
        $u = $st->fetch();

        if ($u && $u['bloqueado_hasta'] && $u['bloqueado_hasta'] > ahora()) {
            responder(['error' => 'Cuenta bloqueada por varios intentos. Prueba de nuevo en unos minutos.'], 429);
        }
        // Se verifica siempre contra un hash (aunque el usuario no exista) para que tarde lo mismo
        $hash = $u ? $u['password_hash'] : '$2y$10$Dze8HCqLVwUTIMuuqkFYquEaseufHysf7aTNgvl3iLNy1GjLq0mVm';
        $ok = password_verify($clave, $hash) && $u;
        if (!$ok) {
            registrar_fallo('login');
            if ($u) {
                $n = (int)$u['intentos'] + 1;
                if ($n >= 5) {
                    db()->prepare('UPDATE usuarios SET intentos = 0, bloqueado_hasta = ? WHERE id = ?')->execute([ahora(600), $u['id']]);
                } else {
                    db()->prepare('UPDATE usuarios SET intentos = ? WHERE id = ?')->execute([$n, $u['id']]);
                }
            }
            usleep(400000);
            responder(['error' => 'Usuario o clave incorrectos.'], 401);
        }
        db()->prepare('UPDATE usuarios SET intentos = 0, bloqueado_hasta = NULL WHERE id = ?')->execute([$u['id']]);
        iniciar_sesion($u['id']);
        $info = usuario_actual();
        responder(['ok' => true, 'rol' => $info['rol'], 'nombre' => $info['nombre']]);
    }

    if ($accion === 'logout' && $metodo === 'POST') {
        unset($_SESSION['usuario_id']);
        session_regenerate_id(true);
        responder(['ok' => true]);
    }
}

// ---------- Tareas (profesores) ----------
if ($p[0] === 'tareas') {
    $prof = requiere_profesor();
    $sub1 = $p[1] ?? '';
    $id   = ctype_digit($sub1) ? (int)$sub1 : 0;

    if ($metodo === 'GET' && $sub1 === 'opciones') {
        $m = db()->prepare('SELECT m.id, m.nombre FROM profesor_materia pm JOIN materias m ON m.id = pm.materia_id WHERE pm.profesor_id = ? ORDER BY m.nombre');
        $m->execute([$prof['id']]);
        responder(['materias' => $m->fetchAll(), 'grados' => db()->query('SELECT id, nombre FROM grados ORDER BY nombre')->fetchAll()]);
    }

    if ($metodo === 'GET' && !$id && $sub1 === '') {
        $st = db()->prepare("SELECT t.id, t.titulo, t.descripcion, t.materia_id, m.nombre AS materia, t.fecha_limite,
            (SELECT GROUP_CONCAT(tg.grado_id ORDER BY g.nombre SEPARATOR ',') FROM tarea_grados tg JOIN grados g ON g.id = tg.grado_id WHERE tg.tarea_id = t.id) AS grados_ids,
            (SELECT GROUP_CONCAT(g.nombre ORDER BY g.nombre SEPARATOR ', ') FROM tarea_grados tg JOIN grados g ON g.id = tg.grado_id WHERE tg.tarea_id = t.id) AS grados_nombres,
            (SELECT COUNT(*) FROM usuarios u WHERE u.rol = 'estudiante' AND u.grado_id IN (SELECT grado_id FROM tarea_grados WHERE tarea_id = t.id)) AS total,
            (SELECT COUNT(*) FROM entregas e JOIN usuarios u ON u.id = e.estudiante_id WHERE e.tarea_id = t.id AND u.grado_id IN (SELECT grado_id FROM tarea_grados WHERE tarea_id = t.id)) AS entregadas
            FROM tareas t JOIN materias m ON m.id = t.materia_id
            WHERE t.profesor_id = ? ORDER BY t.fecha_limite DESC");
        $st->execute([$prof['id']]);
        $ahora = ahora_bogota();
        $filas = $st->fetchAll();
        foreach ($filas as &$f) {
            $f['grados']   = $f['grados_ids'] === null ? [] : array_map('intval', explode(',', $f['grados_ids']));
            $f['total']    = (int)$f['total'];
            $f['entregadas'] = (int)$f['entregadas'];
            $f['vencida']  = $f['fecha_limite'] < $ahora;
            unset($f['grados_ids']);
        }
        unset($f);
        responder($filas);
    }

    if ($metodo === 'POST' && !$id && $sub1 === '') {
        [$titulo, $desc, $mid, $fecha, $gr] = leer_tarea($datos, $prof['id']);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO tareas (materia_id, profesor_id, titulo, descripcion, fecha_limite) VALUES (?,?,?,?,?)')
                ->execute([$mid, $prof['id'], $titulo, $desc, $fecha]);
            guardar_grados_tarea((int)$pdo->lastInsertId(), $gr);
            $pdo->commit();
        } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
        responder(['ok' => true]);
    }

    if ($metodo === 'PUT' && $id && ($p[2] ?? '') === '') {
        tarea_propia($id, $prof['id']);
        [$titulo, $desc, $mid, $fecha, $gr] = leer_tarea($datos, $prof['id']);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('UPDATE tareas SET materia_id = ?, titulo = ?, descripcion = ?, fecha_limite = ? WHERE id = ?')
                ->execute([$mid, $titulo, $desc, $fecha, $id]);
            guardar_grados_tarea($id, $gr);
            $pdo->commit();
        } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
        responder(['ok' => true]);
    }

    if ($metodo === 'DELETE' && $id && ($p[2] ?? '') === '') {
        tarea_propia($id, $prof['id']);
        db()->prepare('DELETE FROM tareas WHERE id = ?')->execute([$id]);   // borra también sus entregas
        responder(['ok' => true]);
    }

    if ($metodo === 'GET' && $id && ($p[2] ?? '') === 'entregas') {
        $t = tarea_propia($id, $prof['id']);
        $st = db()->prepare("SELECT u.id AS estudiante_id, u.nombre, u.usuario, g.nombre AS grado,
                e.fecha_entrega, e.comentario, e.archivo_url
            FROM usuarios u
            JOIN grados g ON g.id = u.grado_id
            JOIN tarea_grados tg ON tg.grado_id = g.id AND tg.tarea_id = ?
            LEFT JOIN entregas e ON e.estudiante_id = u.id AND e.tarea_id = ?
            WHERE u.rol = 'estudiante' ORDER BY g.nombre, u.nombre");
        $st->execute([$id, $id]);
        $filas = $st->fetchAll();
        $entregadas = 0;
        foreach ($filas as &$f) {
            $f['entregada'] = $f['fecha_entrega'] !== null;
            // La fecha de entrega se guarda en hora de Colombia, igual que el plazo (ver paso de estudiantes)
            $f['tarde'] = $f['entregada'] && $f['fecha_entrega'] > $t['fecha_limite'];
            if ($f['entregada']) $entregadas++;
        }
        unset($f);
        responder(['tarea' => ['id' => (int)$t['id'], 'titulo' => $t['titulo'], 'fecha_limite' => $t['fecha_limite']],
                   'total' => count($filas), 'entregadas' => $entregadas, 'filas' => $filas]);
    }
}

// ---------- Gestión de estudiantes (profesores y admin) ----------
if ($p[0] === 'gestion') {
    requiere_gestion();
    $accion = $p[1] ?? '';
    $id = isset($p[2]) ? (int)$p[2] : 0;

    if ($accion === 'grados' && $metodo === 'GET') {
        responder(db()->query("SELECT g.id, g.nombre, g.codigo, g.registro_activo,
            (SELECT COUNT(*) FROM usuarios u WHERE u.grado_id = g.id AND u.rol = 'estudiante') AS estudiantes
            FROM grados g ORDER BY g.nombre")->fetchAll());
    }

    if ($accion === 'estudiantes') {
        if ($metodo === 'GET' && !$id) {
            $gid = isset($_GET['grado']) ? (int)$_GET['grado'] : 0;
            $sql = "SELECT u.id, u.nombre, u.usuario, u.grado_id, g.nombre AS grado, u.creado
                    FROM usuarios u LEFT JOIN grados g ON g.id = u.grado_id
                    WHERE u.rol = 'estudiante'" . ($gid ? ' AND u.grado_id = ?' : '') . ' ORDER BY u.nombre';
            $st = db()->prepare($sql);
            $st->execute($gid ? [$gid] : []);
            responder($st->fetchAll());
        }

        if ($metodo === 'POST' && !$id) {
            $nombre  = texto_campo($datos, 'nombre', 100);
            $usuario = mb_strtolower(texto_campo($datos, 'usuario', 40), 'UTF-8');
            $clave   = isset($datos['clave']) && is_string($datos['clave']) ? $datos['clave'] : '';
            $gid     = isset($datos['grado_id']) ? (int)$datos['grado_id'] : 0;
            if (mb_strlen($nombre, 'UTF-8') < 3) responder(['error' => 'Escribe el nombre completo.'], 400);
            if (!usuario_valido($usuario)) responder(['error' => 'Usuario no válido (4 a 30 caracteres: minúsculas, números, punto, guion o guion bajo).'], 400);
            if (!clave_valida($clave)) responder(['error' => 'La clave debe tener entre 8 y 72 caracteres.'], 400);
            $g = db()->prepare('SELECT id FROM grados WHERE id = ?');
            $g->execute([$gid]);
            if (!$g->fetch()) responder(['error' => 'Elige un grado válido.'], 400);
            try {
                db()->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol, grado_id) VALUES (?,?,?,?,?)')
                    ->execute([$nombre, $usuario, password_hash($clave, PASSWORD_DEFAULT), 'estudiante', $gid]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') responder(['error' => 'Ese usuario ya existe, elige otro.'], 409);
                throw $e;
            }
            responder(['ok' => true]);
        }

        if (($metodo === 'PUT' || $metodo === 'DELETE') && $id) {
            // Solo se pueden tocar cuentas de estudiantes (nunca de profesores ni admin)
            $e = db()->prepare("SELECT id FROM usuarios WHERE id = ? AND rol = 'estudiante'");
            $e->execute([$id]);
            if (!$e->fetch()) responder(['error' => 'Estudiante no encontrado'], 404);

            if ($metodo === 'DELETE') {
                db()->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
                responder(['ok' => true]);
            }

            $sets = [];
            $vals = [];
            if (array_key_exists('nombre', $datos)) {
                $n = texto_campo($datos, 'nombre', 100);
                if (mb_strlen($n, 'UTF-8') < 3) responder(['error' => 'Escribe el nombre completo.'], 400);
                $sets[] = 'nombre = ?'; $vals[] = $n;
            }
            if (array_key_exists('usuario', $datos)) {
                $u = mb_strtolower(texto_campo($datos, 'usuario', 40), 'UTF-8');
                if (!usuario_valido($u)) responder(['error' => 'Usuario no válido (4 a 30 caracteres: minúsculas, números, punto, guion o guion bajo).'], 400);
                $sets[] = 'usuario = ?'; $vals[] = $u;
            }
            if (array_key_exists('grado_id', $datos)) {
                $gid = (int)$datos['grado_id'];
                $g = db()->prepare('SELECT id FROM grados WHERE id = ?');
                $g->execute([$gid]);
                if (!$g->fetch()) responder(['error' => 'Elige un grado válido.'], 400);
                $sets[] = 'grado_id = ?'; $vals[] = $gid;
            }
            if (array_key_exists('clave', $datos)) {
                $c = is_string($datos['clave']) ? $datos['clave'] : '';
                if (!clave_valida($c)) responder(['error' => 'La clave debe tener entre 8 y 72 caracteres.'], 400);
                $sets[] = 'password_hash = ?'; $vals[] = password_hash($c, PASSWORD_DEFAULT);
                $sets[] = 'intentos = 0';
                $sets[] = 'bloqueado_hasta = NULL';
            }
            if (!$sets) responder(['error' => 'No hay nada que cambiar.'], 400);
            $vals[] = $id;
            try {
                db()->prepare('UPDATE usuarios SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') responder(['error' => 'Ese usuario ya existe, elige otro.'], 409);
                throw $e;
            }
            responder(['ok' => true]);
        }
    }
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

    if ($accion === 'grados') {
        requiere_admin();
        $id = isset($p[2]) ? (int)$p[2] : 0;
        if ($metodo === 'GET' && !$id) {
            foreach (db()->query('SELECT id FROM grados WHERE codigo IS NULL')->fetchAll() as $g) {
                db()->prepare('UPDATE grados SET codigo = ? WHERE id = ?')->execute([codigo_aleatorio(), $g['id']]);
            }
            responder(db()->query('SELECT g.id, g.nombre, g.codigo, g.registro_activo,
                (SELECT COUNT(*) FROM usuarios u WHERE u.grado_id = g.id) AS estudiantes
                FROM grados g ORDER BY g.nombre')->fetchAll());
        }
        if ($metodo === 'PUT' && $id) {
            if (!empty($datos['regenerar'])) {
                db()->prepare('UPDATE grados SET codigo = ? WHERE id = ?')->execute([codigo_aleatorio(), $id]);
            }
            if (array_key_exists('registro_activo', $datos)) {
                db()->prepare('UPDATE grados SET registro_activo = ? WHERE id = ?')->execute([!empty($datos['registro_activo']) ? 1 : 0, $id]);
            }
            responder(['ok' => true]);
        }
    }

    if ($accion === 'materias' && $metodo === 'GET') {
        requiere_admin();
        responder(db()->query('SELECT id, nombre FROM materias ORDER BY nombre')->fetchAll());
    }

    if ($accion === 'usuarios') {
        requiere_admin();
        $id = isset($p[2]) ? (int)$p[2] : 0;

        if ($metodo === 'GET' && !$id) {
            responder(db()->query("SELECT u.id, u.nombre, u.usuario, u.rol, g.nombre AS grado, u.creado,
                (SELECT GROUP_CONCAT(m.nombre SEPARATOR ', ') FROM profesor_materia pm JOIN materias m ON m.id = pm.materia_id WHERE pm.profesor_id = u.id) AS materias,
                (SELECT GROUP_CONCAT(pm.materia_id) FROM profesor_materia pm WHERE pm.profesor_id = u.id) AS materias_ids
                FROM usuarios u LEFT JOIN grados g ON g.id = u.grado_id
                ORDER BY FIELD(u.rol, 'admin', 'profesor', 'estudiante'), u.nombre")->fetchAll());
        }

        if ($metodo === 'POST' && !$id) {   // crear profesor
            $nombre  = texto_campo($datos, 'nombre', 100);
            $usuario = mb_strtolower(texto_campo($datos, 'usuario', 40), 'UTF-8');
            $clave   = isset($datos['clave']) && is_string($datos['clave']) ? $datos['clave'] : '';
            if (mb_strlen($nombre, 'UTF-8') < 3) responder(['error' => 'Escribe el nombre del profesor.'], 400);
            if (!usuario_valido($usuario)) responder(['error' => 'Usuario no válido (4 a 30 caracteres: minúsculas, números, punto, guion o guion bajo).'], 400);
            if (!clave_valida($clave)) responder(['error' => 'La clave debe tener entre 8 y 72 caracteres.'], 400);
            $materias = isset($datos['materias']) && is_array($datos['materias']) ? array_unique(array_map('intval', $datos['materias'])) : [];
            $pdo = db();
            $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?,?,?,?)')
                    ->execute([$nombre, $usuario, password_hash($clave, PASSWORD_DEFAULT), 'profesor']);
                $nuevo = (int)$pdo->lastInsertId();
                $ins = $pdo->prepare('INSERT INTO profesor_materia (profesor_id, materia_id) VALUES (?,?)');
                foreach ($materias as $m) $ins->execute([$nuevo, $m]);
                $pdo->commit();
            } catch (PDOException $e) {
                $pdo->rollBack();
                if ($e->getCode() === '23000') responder(['error' => 'Ese usuario ya existe o una materia no es válida.'], 409);
                throw $e;
            }
            responder(['ok' => true]);
        }

        if ($metodo === 'PUT' && $id) {     // nueva clave y/o materias del profesor
            if (array_key_exists('clave', $datos)) {
                $clave = is_string($datos['clave']) ? $datos['clave'] : '';
                if (!clave_valida($clave)) responder(['error' => 'La clave debe tener entre 8 y 72 caracteres.'], 400);
                db()->prepare('UPDATE usuarios SET password_hash = ?, intentos = 0, bloqueado_hasta = NULL WHERE id = ?')
                    ->execute([password_hash($clave, PASSWORD_DEFAULT), $id]);
            }
            if (array_key_exists('materias', $datos)) {
                $q = db()->prepare("SELECT id FROM usuarios WHERE id = ? AND rol = 'profesor'");
                $q->execute([$id]);
                if (!$q->fetch()) responder(['error' => 'Solo los profesores tienen materias.'], 400);
                $materias = is_array($datos['materias']) ? array_values(array_unique(array_map('intval', $datos['materias']))) : [];
                $pdo = db();
                $pdo->beginTransaction();
                try {
                    $pdo->prepare('DELETE FROM profesor_materia WHERE profesor_id = ?')->execute([$id]);
                    $ins = $pdo->prepare('INSERT INTO profesor_materia (profesor_id, materia_id) VALUES (?,?)');
                    foreach ($materias as $m) $ins->execute([$id, $m]);
                    $pdo->commit();
                } catch (PDOException $e) {
                    $pdo->rollBack();
                    if ($e->getCode() === '23000') responder(['error' => 'Alguna materia no es válida.'], 400);
                    throw $e;
                }
            }
            responder(['ok' => true]);
        }

        if ($metodo === 'DELETE' && $id) {
            try {
                db()->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') responder(['error' => 'No se puede borrar: tiene tareas creadas.'], 409);
                throw $e;
            }
            responder(['ok' => true]);
        }
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