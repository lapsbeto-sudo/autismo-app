const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'autismo.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    // Cargar base de datos existente o crear nueva
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Habilitar foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Crear tablas
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        especialidad TEXT DEFAULT 'Psicología Clínica',
        rol TEXT DEFAULT 'psicologo' CHECK(rol IN ('admin', 'psicologo')),
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS patients (
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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        codigo TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        edad_min_meses INTEGER NOT NULL,
        edad_max_meses INTEGER NOT NULL,
        metodo_aplicacion TEXT CHECK(metodo_aplicacion IN ('autoadmin', 'observacion', 'entrevista')),
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS test_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        seccion TEXT,
        orden INTEGER NOT NULL,
        texto TEXT NOT NULL,
        tipo_respuesta TEXT NOT NULL CHECK(tipo_respuesta IN ('si_no', 'Likert_4', 'Likert_5', 'opcion_multiple', 'escala')),
        opciones_json TEXT,
        peso_puntos INTEGER DEFAULT 1,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS test_applications (
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
        recomendaciones TEXT,
        informe_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (test_id) REFERENCES tests(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Evaluaciones diagnósticas (para instrumentos como ADOS-2, ADI-R, etc.)
    db.run(`CREATE TABLE IF NOT EXISTS diagnostic_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        instrumento TEXT NOT NULL,
        fecha_evaluacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        edad_evaluacion TEXT,
        area_evaluada TEXT,
        resultado TEXT,
        nivel_gravedad TEXT CHECK(nivel_gravedad IN ('nivel_1', 'nivel_2', 'nivel_3', 'no_aplica')),
        observaciones TEXT,
        recomendaciones TEXT,
        informe_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Verificar si los tests ya están insertados
    const existingTests = db.exec("SELECT COUNT(*) as count FROM tests");
    const count = existingTests[0]?.values[0][0] || 0;

    if (count === 0) {
        // Insertar tests iniciales
        db.run(`INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion) VALUES (
            'Modified Checklist for Autism in Toddlers - Revised with Follow-up',
            'MCHAT-RF',
            'Cuestionario de tamizaje para autismo en niños pequeños. Se aplica a padres/cuidadores. Incluye 20 ítems + entrevista de seguimiento para riesgo medio.',
            16, 30, 'entrevista'
        )`);

        db.run(`INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion) VALUES (
            'Autism Detection in Early Childhood',
            'ADEC',
            'Instrumento de observación directa del niño. Evalúa 12 dominios del comportamiento. Diseñado para detección temprana.',
            12, 48, 'observacion'
        )`);

        db.run(`INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion) VALUES (
            'Instrumento de Tamizaje del Espectro Autista',
            'ITEA',
            'Instrumento desarrollado y validado en Ecuador. 32 ítems distribuidos en 7 categorías: lenguaje, comunicación, competencias sociales, afectividad, procesamiento de la información, inflexibilidad y sensopercepción.',
            48, 204, 'autoadmin'
        )`);

        db.run(`INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion) VALUES (
            'Denver Developmental Screening Test II',
            'DENVERII',
            'Escala de neurodesarrollo que evalúa 4 áreas: personal-social, motor fino adaptativo, lenguaje y motor grueso. Requiere aplicación por profesional entrenado.',
            0, 72, 'observacion'
        )`);

        // Insertar ítems M-CHAT-R/F (20 ítems)
        const mchatItems = [
            '¿Su hijo le disfruta cuando le juega "cuclillas" o lo esconden?',
            '¿Su hijo le busca para compartir la diversión?',
            '¿Su hijo gusta de las actividades motoras como trepar, subirse a las cosas?',
            '¿Su hijo disfruta jugando con juguetes o hace otras cosas de manera creativa?',
            '¿Su hijo le señala cosas de interés?',
            '¿Su hijo le señala para pedir ayuda?',
            '¿Su hijo le señala para mostrarle algo que le gusta?',
            '¿Su hijo le responde cuando le llama por su nombre?',
            '¿Su hijo le mira cuando le habla?',
            '¿Su hijo entiende cuando le dice "No"?',
            '¿Su hijo parece sentir miedo en situaciones en las que usted no espera que tenga miedo?',
            '¿Su hijo tiene contacto visual con la gente?',
            '¿Su hijo sonríe cuando otros le sonríen o le saludan?',
            '¿Su hijo se molest cuando la gente cambia de tema o hace otra cosa?',
            '¿Su hijo intenta imitar lo que usted hace?',
            'Si le da un juguete nuevo a su hijo, ¿le dice el nombre del juguete o lo describe?',
            '¿Su hijo le señala para hacer cosas que le gustan?',
            '¿Su hijo le mira para ver si usted aprueba lo que está haciendo?',
            '¿A su hijo le molestan los ruidos que otros niños no parecen notar?',
            '¿Su hijo disfruta bailando o haciendo movimientos rítmicos?'
        ];

        mchatItems.forEach((texto, index) => {
            db.run(`INSERT INTO test_items (test_id, seccion, orden, texto, tipo_respuesta, peso_puntos) VALUES (1, NULL, ?, ?, 'si_no', 1)`, [index + 1, texto]);
        });

        // Insertar ítems ITEA (32 ítems en 7 categorías)
        const iteaSections = {
            'Lenguaje': [
                'Repite frases o palabras que ha escuchado recientemente (ecolalia)',
                'Tiene dificultad para comprender preguntas o instrucciones simples',
                'Habla en un tono monótono o extraño',
                'Utiliza palabras de manera inusual o inventa palabras',
                'Tiene dificultad para mantener una conversación',
                'Le cuesta explicar sus necesidades o sentimientos',
                'Prefiere estar solo en lugar de jugar con otros niños',
                'Tiene interés limitado en una o dos actividades'
            ],
            'Comunicación': [
                'No utiliza gestos como señalar, saludar o negar con la cabeza',
                'Tiene dificultad para entender gestos o expresiones faciales',
                'No mantiene contacto visual durante la comunicación',
                'Le cuesta entender instrucciones verbales',
                'No responde a su nombre cuando se le llama',
                'Tiene dificultad para expresar sus emociones',
                'Utiliza el lenguaje de manera literal, sin entender el sarcasmo o las bromas'
            ],
            'Competencias Sociales': [
                'Le cuesta hacer amigos o mantener amistades',
                'No participa en juegos grupales o actividades sociales',
                'Le cuesta entender las reglas sociales básicas',
                'Muestra poco interés en las personas que lo rodean',
                'Le cuesta interpretar intenciones o sentimientos de otros',
                'Tiene dificultad para cooperar en actividades grupales'
            ],
            'Afectividad': [
                'Muestra expresiones emocionales limitadas o inapropiadas',
                'Le cuesta entender las emociones de los demás',
                'No busca consuelo cuando está triste o molesto',
                'Tiene dificultad para expresar cariño',
                'Reacciona de manera desproporcionada ante cambios'
            ],
            'Procesamiento de la Información': [
                'Le cuesta prestar atención a instrucciones o tareas',
                'Se distrae fácilmente con estímulos del ambiente',
                'Le cuesta organizar sus pensamientos o actividades',
                'Tiene dificultad para generalizar aprendizajes a nuevos contextos'
            ],
            'Inflexibilidad': [
                'Insiste en seguir rutinas o rituales específicos',
                'Se molesta ante cambios en su rutina diaria',
                'Tiene intereses muy restringidos y intensos',
                'Se obsesiona con objetos o temas específicos',
                'Realiza movimientos repetitivos (balanceo, aleteo de manos)'
            ],
            'Sensopercepción': [
                'Es hipersensible a ciertos sonidos, luces o texturas',
                'Busca activamente estímulos sensoriales específicos',
                'Ignora estímulos sensoriales que otros notan',
                'Tiene una reacción inusual ante el dolor o la temperatura'
            ]
        };

        let orden = 1;
        Object.entries(iteaSections).forEach(([seccion, items]) => {
            items.forEach(texto => {
                db.run(`INSERT INTO test_items (test_id, seccion, orden, texto, tipo_respuesta, peso_puntos) VALUES (3, ?, ?, ?, 'Likert_5', 1)`, [seccion, orden, texto]);
                orden++;
            });
        });

        // Insertar ítems ADEC (12 dominios)
        const adecDomains = [
            'Atención conjunta',
            'Juego funcional',
            'Juego simbólico',
            'Interacción social',
            'Contacto visual',
            'Expresiones faciales',
            'Lenguaje comprensivo',
            'Lenguaje expresivo',
            'Comunicación no verbal',
            'Comportamiento estereotipado',
            'Intereses restringidos',
            'Regulación sensorial'
        ];

        adecDomains.forEach((domain, index) => {
            db.run(`INSERT INTO test_items (test_id, seccion, orden, texto, tipo_respuesta, peso_puntos) VALUES (2, ?, ?, ?, 'Likert_5', 1)`, [domain, index + 1, `Evaluar el nivel de ${domain.toLowerCase()} en el niño/a`]);
        });

        // Insertar ítems Denver II (4 áreas principales con ejemplos)
        const denverAreas = [
            { area: 'Personal-Social', items: ['Sonríe socialmente', 'Contacto visual', 'Responde a su nombre', 'Juguetes favoritos', 'Señala cosas de interés', 'Gesto de despedida'] },
            { area: 'Motor Fino Adaptativo', items: ['Agarra objetos', 'Explora objetos', 'Lleva objetos a la boca', 'Libera objetos voluntariamente', 'Transfiere objetos de una mano a otra'] },
            { area: 'Lenguaje', items: ['Balbucea', 'Dice palabras simples', 'Combina dos palabras', 'Sigue instrucciones simples', 'Señala objetos nombrados'] },
            { area: 'Motor Grueso', items: ['Sostiene la cabeza', 'Se sienta sin apoyo', 'Gatea', 'Se pone de pie', 'Camina'] }
        ];

        let denverOrden = 1;
        denverAreas.forEach(({ area, items }) => {
            items.forEach(texto => {
                db.run(`INSERT INTO test_items (test_id, seccion, orden, texto, tipo_respuesta, peso_puntos) VALUES (4, ?, ?, ?, 'si_no', 1)`, [area, denverOrden, texto]);
                denverOrden++;
            });
        });

        console.log('Tests e ítems iniciales insertados correctamente');
    }

    // Crear usuario admin predeterminado si no existe ningún admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@autismo-app.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmins = db.exec("SELECT COUNT(*) as count FROM users WHERE rol = 'admin'");
    const adminCount = existingAdmins[0]?.values[0][0] || 0;
    
    if (adminCount === 0) {
        const passwordHash = bcrypt.hashSync(adminPassword, 10);
        db.run(
            `INSERT INTO users (nombre, apellido, email, password_hash, especialidad, rol) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Administrador', 'Sistema', adminEmail, passwordHash, 'Administración', 'admin']
        );
        console.log(`Usuario admin creado: ${adminEmail}`);
    }

    saveDatabase();
    console.log('Base de datos inicializada correctamente');
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Guardar cada 30 segundos
setInterval(saveDatabase, 30000);

// Guardar al cerrar el proceso
process.on('SIGINT', () => {
    saveDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    saveDatabase();
    process.exit(0);
});

module.exports = { initDatabase, getDb: () => db, saveDatabase };