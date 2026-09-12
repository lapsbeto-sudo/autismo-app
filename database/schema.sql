-- ========================================
-- Base de datos: Aplicación Tests Autismo
-- ========================================

-- Usuarios (Psicólogos)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    especialidad TEXT DEFAULT 'Psicología Clínica',
    rol TEXT DEFAULT 'psicologo' CHECK(rol IN ('admin', 'psicologo')),
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pacientes (Niños y Adolescentes)
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento TEXT NOT NULL,
    sexo TEXT NOT NULL CHECK(sexo IN ('M', 'F')),
    cedula TEXT UNIQUE,
    direccion TEXT,
    telefono_contacto TEXT,
    nombre_padre TEXT,
    nombre_madre TEXT,
    motivo_consulta TEXT,
    observaciones TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Catálogo de Tests (extensible)
CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    edad_min_meses INTEGER NOT NULL,
    edad_max_meses INTEGER NOT NULL,
    metodo_aplicacion TEXT CHECK(metodo_aplicacion IN ('autoadmin', 'observacion', 'entrevista')),
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ítems de cada Test
CREATE TABLE IF NOT EXISTS test_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    seccion TEXT,
    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    tipo_respuesta TEXT NOT NULL CHECK(tipo_respuesta IN ('si_no', 'Likert_4', 'Likert_5', 'opcion_multiple', 'escala')),
    opciones_json TEXT,
    peso_puntos INTEGER DEFAULT 1,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- Aplicaciones de Tests (evaluaciones realizadas)
CREATE TABLE IF NOT EXISTS test_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    fecha_aplicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    respuestas_json TEXT NOT NULL,
    puntuacion_total REAL,
    puntuacion_por_seccion TEXT,
    nivel_riesgo TEXT CHECK(nivel_riesgo IN ('bajo', 'medio', 'alto')),
    observaciones TEXT,
    informe_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (test_id) REFERENCES tests(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========================================
-- Datos iniciales: 4 Tests Ecuador
-- ========================================

-- M-CHAT-R/F (16-30 meses)
INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion)
VALUES (
    'Modified Checklist for Autism in Toddlers - Revised with Follow-up',
    'MCHAT-RF',
    'Cuestionario de tamizaje para autismo en niños pequeños. Se aplica a padres/cuidadores. Incluye 20 ítems + entrevista de seguimiento para riesgo medio.',
    16, 30, 'entrevista'
);

-- ADEC (12-48 meses)
INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion)
VALUES (
    'Autism Detection in Early Childhood',
    'ADEC',
    'Instrumento de observación directa del niño. Evalúa 12 dominios del comportamiento. Diseñado para detección temprana.',
    12, 48, 'observacion'
);

-- ITEA (4-17 años)
INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion)
VALUES (
    'Instrumento de Tamizaje del Espectro Autista',
    'ITEA',
    'Instrumento desarrollado y validado en Ecuador. 32 ítems distribuidos en 7 categorías: lenguaje, comunicación, competencias sociales, afectividad, procesamiento de la información, inflexibilidad y sensopercepción.',
    48, 204, 'autoadmin'
);

-- Denver II (0-6 años)
INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion)
VALUES (
    'Denver Developmental Screening Test II',
    'DENVERII',
    'Escala de neurodesarrollo que evalúa 4 áreas: personal-social, motor fino adaptativo, lenguaje y motor grueso. Requiere aplicación por profesional entrenado.',
    0, 72, 'observacion'
);