<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$action = $_GET['action'] ?? '';
$TOKEN_ESP32 = 'CAMBIA_ESTA_CLAVE_2026';

function responder($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function guardarLectura(PDO $pdo, int $idDispositivo, $valor) {
    if ($valor === null || $valor === '' || !is_numeric($valor)) {
        return;
    }

    $stmt = $pdo->prepare("INSERT INTO lecturas (id_dispositivo, valor) VALUES (?, ?)");
    $stmt->execute([$idDispositivo, $valor]);

    $stmt = $pdo->prepare("INSERT INTO historial (id_dispositivo, tipo_evento, valor_registrado) VALUES (?, 'lectura', ?)");
    $stmt->execute([$idDispositivo, (string)$valor]);
}

function cumpleCondicion($valor, string $operador, $limite): bool {
    $valor = (float)$valor;
    $limite = (float)$limite;

    switch ($operador) {
        case '>': return $valor > $limite;
        case '<': return $valor < $limite;
        case '>=': return $valor >= $limite;
        case '<=': return $valor <= $limite;
        case '==': return $valor == $limite;
        default: return false;
    }
}

function guardarEstadoActuador(PDO $pdo, int $idActuador, string $estado, string $origen = 'automatico') {
    $estado = strtolower($estado);

    if ($estado !== 'encendido' && $estado !== 'apagado') {
        return;
    }

    $stmt = $pdo->prepare("
        SELECT estado_actual 
        FROM estado_actuadores 
        WHERE id_dispositivo = ? 
        ORDER BY fecha_cambio DESC, id_estado DESC 
        LIMIT 1
    ");
    $stmt->execute([$idActuador]);
    $ultimo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($ultimo && $ultimo['estado_actual'] === $estado) {
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO estado_actuadores (id_dispositivo, estado_actual, origen)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$idActuador, $estado, $origen]);

    $stmt = $pdo->prepare("
        INSERT INTO historial (id_dispositivo, tipo_evento, valor_registrado)
        VALUES (?, 'cambio_estado', ?)
    ");
    $stmt->execute([$idActuador, $estado]);
}

function aplicarAutomatizacion(PDO $pdo, array $valoresPorSensor) {
    $stmt = $pdo->query("SELECT * FROM automatizacion WHERE activa = 1");
    $reglas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($reglas as $regla) {
        $idSensor = (int)$regla['id_sensor_condicion'];

        if (!array_key_exists($idSensor, $valoresPorSensor)) {
            continue;
        }

        $valorSensor = $valoresPorSensor[$idSensor];

        if (cumpleCondicion($valorSensor, $regla['condicion_operador'], $regla['condicion_valor'])) {
            $estado = $regla['accion_resultado'] === 'encender' ? 'encendido' : 'apagado';
            $idActuador = (int)$regla['id_actuador_accion'];

            guardarEstadoActuador($pdo, $idActuador, $estado, 'automatico');

            $mensaje = 'Regla ' . $regla['nombre_regla'] . ' activada';
            $stmtHist = $pdo->prepare("
                INSERT INTO historial (id_dispositivo, tipo_evento, valor_registrado)
                VALUES (?, 'automatizacion', ?)
            ");
            $stmtHist->execute([$idActuador, $mensaje]);
        }
    }
}

function obtenerOrdenesActuadores(PDO $pdo) {
    $sql = "
        SELECT 
            d.id_dispositivo,
            d.nombre_dispositivo,
            d.tipo_medicion,
            COALESCE(
                (
                    SELECT ea.estado_actual
                    FROM estado_actuadores ea
                    WHERE ea.id_dispositivo = d.id_dispositivo
                    ORDER BY ea.fecha_cambio DESC, ea.id_estado DESC
                    LIMIT 1
                ),
                'apagado'
            ) AS estado_actual
        FROM dispositivos d
        WHERE d.id_tipo = 2
        ORDER BY d.id_dispositivo ASC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $ordenes = [];

    foreach ($rows as $row) {
        $tipo = $row['tipo_medicion'];
        $estado = $row['estado_actual'];

        $ordenes[$tipo] = $estado;

        if ($tipo === 'aspersor') {
            $ordenes['bomba'] = $estado;
        }
    }

    return $ordenes;
}

try {
    switch ($action) {

        case 'guardar_lectura':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                responder([
                    'success' => false,
                    'error' => 'Usa POST para guardar lecturas'
                ], 405);
            }

            $data = bodyJson();

            if (($data['token'] ?? '') !== $TOKEN_ESP32) {
                responder([
                    'success' => false,
                    'error' => 'Token no autorizado'
                ], 401);
            }

            $valores = [
                1 => $data['temperatura'] ?? null,
                2 => $data['humedad_ambiente'] ?? null,
                3 => $data['calidad_aire'] ?? null,
                4 => $data['humedad_suelo'] ?? null,
            ];

            foreach ($valores as $idDispositivo => $valor) {
                guardarLectura($pdo, $idDispositivo, $valor);
            }

            $valoresValidos = [];

            foreach ($valores as $idDispositivo => $valor) {
                if ($valor !== null && $valor !== '' && is_numeric($valor)) {
                    $valoresValidos[$idDispositivo] = $valor;
                }
            }

            aplicarAutomatizacion($pdo, $valoresValidos);

            responder([
                'success' => true,
                'mensaje' => 'Lecturas guardadas correctamente',
                'ordenes' => obtenerOrdenesActuadores($pdo)
            ]);
            break;

        case 'get_lecturas_actuales':
            $sql = "
                SELECT 
                    d.id_dispositivo,
                    d.nombre_dispositivo,
                    d.tipo_medicion,
                    d.unidad_medida,
                    l.valor,
                    l.fecha_lectura
                FROM dispositivos d
                JOIN lecturas l ON l.id_lectura = (
                    SELECT l2.id_lectura
                    FROM lecturas l2
                    WHERE l2.id_dispositivo = d.id_dispositivo
                    ORDER BY l2.fecha_lectura DESC, l2.id_lectura DESC
                    LIMIT 1
                )
                WHERE d.id_tipo = 1
                ORDER BY d.id_dispositivo ASC
            ";

            $stmt = $pdo->query($sql);
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_historial':
            $tipo = $_GET['tipo'] ?? 'temperatura';
            $fecha_inicio = $_GET['fecha_inicio'] ?? null;
            $fecha_fin = $_GET['fecha_fin'] ?? null;

            $sql = "
                SELECT 
                    l.fecha_lectura AS fecha, 
                    l.valor 
                FROM lecturas l
                JOIN dispositivos d ON l.id_dispositivo = d.id_dispositivo
                WHERE d.tipo_medicion = ?
            ";

            $params = [$tipo];

            if ($fecha_inicio && $fecha_fin) {
                $sql .= " AND DATE(l.fecha_lectura) BETWEEN ? AND ?";
                $params[] = $fecha_inicio;
                $params[] = $fecha_fin;
            }

            $sql .= " ORDER BY l.fecha_lectura ASC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_estado_actuadores':
            responder(obtenerOrdenesActuadores($pdo));
            break;

        case 'cambiar_estado_actuador':
            $data = bodyJson();

            $actuador = strtolower($data['actuador'] ?? '');
            $estado = strtolower($data['estado'] ?? 'apagado');

            $map = [
                'aspersor' => 5,
                'bomba' => 5,
                'ventilador' => 6
            ];

            $idActuador = $map[$actuador] ?? (int)($data['id_dispositivo'] ?? 0);

            if (!$idActuador) {
                responder([
                    'success' => false,
                    'error' => 'Actuador no válido'
                ], 400);
            }

            guardarEstadoActuador($pdo, $idActuador, $estado, 'manual');

            responder([
                'success' => true,
                'ordenes' => obtenerOrdenesActuadores($pdo)
            ]);
            break;

        case 'get_automatizaciones':
            $stmt = $pdo->query("SELECT * FROM automatizacion ORDER BY id_automatizacion ASC");
            responder($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'toggle_automatizacion':
            $data = bodyJson();

            $stmt = $pdo->prepare("
                UPDATE automatizacion 
                SET activa = ? 
                WHERE id_automatizacion = ?
            ");
            $stmt->execute([
                $data['activa'] ?? 0,
                $data['id'] ?? 0
            ]);

            responder(['success' => true]);
            break;

        case 'actualizar_parametros':
            $data = bodyJson();
            responder([
                'success' => true,
                'data' => $data
            ]);
            break;

case 'actualizar_automatizacion':
    $data = bodyJson();

    $id = (int)($data['id_automatizacion'] ?? 0);
    $operador = $data['condicion_operador'] ?? null;
    $valor = $data['condicion_valor'] ?? null;
    $accion = $data['accion_resultado'] ?? null;

    if (!$id) {
        responder([
            'success' => false,
            'error' => 'ID de automatización no válido'
        ], 400);
    }

    $operadoresPermitidos = ['<', '>', '<=', '>=', '=='];
    $accionesPermitidas = ['encender', 'apagar'];

    if ($operador !== null && !in_array($operador, $operadoresPermitidos)) {
        responder([
            'success' => false,
            'error' => 'Operador no válido'
        ], 400);
    }

    if ($accion !== null && !in_array($accion, $accionesPermitidas)) {
        responder([
            'success' => false,
            'error' => 'Acción no válida'
        ], 400);
    }

    $campos = [];
    $params = [];

    if ($operador !== null) {
        $campos[] = "condicion_operador = ?";
        $params[] = $operador;
    }

    if ($valor !== null && is_numeric($valor)) {
        $campos[] = "condicion_valor = ?";
        $params[] = $valor;
    }

    if ($accion !== null) {
        $campos[] = "accion_resultado = ?";
        $params[] = $accion;
    }

    if (empty($campos)) {
        responder([
            'success' => false,
            'error' => 'No hay datos para actualizar'
        ], 400);
    }

    $campos[] = "fecha_ultima_modificacion = NOW()";
    $params[] = $id;

    $sql = "UPDATE automatizacion SET " . implode(", ", $campos) . " WHERE id_automatizacion = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    responder([
        'success' => true,
        'mensaje' => 'Regla actualizada correctamente'
    ]);
    break;

case 'toggle_todas_automatizaciones':
    $data = bodyJson();
    $activa = (int)($data['activa'] ?? 0);

    $stmt = $pdo->prepare("
        UPDATE automatizacion
        SET activa = ?, fecha_ultima_modificacion = NOW()
    ");
    $stmt->execute([$activa]);

    responder([
        'success' => true,
        'mensaje' => $activa ? 'Todas las reglas fueron activadas' : 'Todas las reglas fueron desactivadas'
    ]);
    break;

        default:
            responder([
                'success' => false,
                'error' => 'Acción no válida'
            ], 400);
    }

} catch (Throwable $e) {
    responder([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}
?>