const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

function queryDb(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function runDb(sql, params = []) {
    const db = getDb();
    db.run(sql, params);
    const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
    return { lastInsertRowid: lastId };
}

// Listar tests disponibles
router.get('/', (req, res) => {
    try {
        const { activo = 1 } = req.query;
        const tests = queryDb('SELECT * FROM tests WHERE activo = ? ORDER BY nombre', [activo]);
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tests' });
    }
});

// Obtener historial de tests de un paciente (ANTES de /:id para evitar conflicto)
router.get('/patient/:patient_id', [
    param('patient_id').isInt()
], (req, res) => {
    try {
        const applications = queryDb(`
            SELECT ta.*, t.nombre as test_nombre, t.codigo as test_codigo
            FROM test_applications ta
            JOIN tests t ON ta.test_id = t.id
            WHERE ta.patient_id = ? AND ta.user_id = ?
            ORDER BY ta.fecha_aplicacion DESC
        `, [req.params.patient_id, req.user.id]);

        res.json(applications.map(app => ({
            ...app,
            respuestas_json: JSON.parse(app.respuestas_json),
            puntuacion_por_seccion: JSON.parse(app.puntuacion_por_seccion || '{}')
        })));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// Obtener test con sus ítems
router.get('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const tests = queryDb('SELECT * FROM tests WHERE id = ?', [req.params.id]);
        if (tests.length === 0) {
            return res.status(404).json({ error: 'Test no encontrado' });
        }

        const items = queryDb('SELECT * FROM test_items WHERE test_id = ? ORDER BY seccion, orden', [req.params.id]);

        res.json({ ...tests[0], items });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener test' });
    }
});

// Registrar aplicación de test
router.post('/:id/apply', [
    param('id').isInt(),
    body('patient_id').isInt().withMessage('ID de paciente requerido'),
    body('respuestas').isObject().withMessage('Respuestas requeridas'),
    body('observaciones').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { patient_id, respuestas, observaciones } = req.body;
        const test_id = req.params.id;

        // Verificar que el test existe
        const tests = queryDb('SELECT * FROM tests WHERE id = ?', [test_id]);
        if (tests.length === 0) {
            return res.status(404).json({ error: 'Test no encontrado' });
        }
        const test = tests[0];

        // Verificar que el paciente existe
        const patients = queryDb('SELECT * FROM patients WHERE id = ? AND user_id = ?', [patient_id, req.user.id]);
        if (patients.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        // Obtener items del test
        const items = queryDb('SELECT * FROM test_items WHERE test_id = ? ORDER BY orden', [test_id]);

        // Calcular puntuación
        let puntuacion_total = 0;
        const puntuacion_por_seccion = {};

        items.forEach(item => {
            const respuesta = respuestas[item.id] || respuestas[item.orden];
            if (respuesta !== undefined && respuesta !== '') {
                let puntos = 0;
                if (typeof respuesta === 'number' || !isNaN(respuesta)) {
                    puntos = parseInt(respuesta) * item.peso_puntos;
                } else if (respuesta === 'si' || respuesta === '1') {
                    puntos = item.peso_puntos;
                }
                puntuacion_total += puntos;

                if (item.seccion) {
                    if (!puntuacion_por_seccion[item.seccion]) {
                        puntuacion_por_seccion[item.seccion] = 0;
                    }
                    puntuacion_por_seccion[item.seccion] += puntos;
                }
            }
        });

        // Determinar nivel de riesgo según el test
        let nivel_riesgo = 'bajo';
        if (test.codigo === 'MCHAT-RF') {
            if (puntuacion_total >= 8) nivel_riesgo = 'alto';
            else if (puntuacion_total >= 3) nivel_riesgo = 'medio';
        } else if (test.codigo === 'ITEA') {
            if (puntuacion_total >= 50) nivel_riesgo = 'alto';
            else if (puntuacion_total >= 35) nivel_riesgo = 'medio';
        } else if (test.codigo === 'ADEC') {
            if (puntuacion_total >= 58) nivel_riesgo = 'alto';
            else if (puntuacion_total >= 47) nivel_riesgo = 'medio';
        }

        // Guardar aplicación
        const result = runDb(
            `INSERT INTO test_applications (
                patient_id, test_id, user_id, respuestas_json,
                puntuacion_total, puntuacion_por_seccion,
                nivel_riesgo, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patient_id, test_id, req.user.id,
                JSON.stringify(respuestas),
                puntuacion_total,
                JSON.stringify(puntuacion_por_seccion),
                nivel_riesgo,
                observaciones || null
            ]
        );

        const application = queryDb('SELECT * FROM test_applications WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Test aplicado exitosamente',
            application: {
                ...application[0],
                respuestas_json: JSON.parse(application[0].respuestas_json),
                puntuacion_por_seccion: JSON.parse(application[0].puntuacion_por_seccion || '{}')
            }
        });
    } catch (error) {
        console.error('Error al aplicar test:', error);
        res.status(500).json({ error: 'Error al aplicar test' });
    }
});

// Obtener detalle de una aplicación
router.get('/application/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const apps = queryDb(`
            SELECT ta.*, t.nombre as test_nombre, t.codigo as test_codigo,
                   p.nombre as patient_nombre, p.apellido as patient_apellido,
                   p.fecha_nacimiento, p.sexo
            FROM test_applications ta
            JOIN tests t ON ta.test_id = t.id
            JOIN patients p ON ta.patient_id = p.id
            WHERE ta.id = ? AND ta.user_id = ?
        `, [req.params.id, req.user.id]);

        if (apps.length === 0) {
            return res.status(404).json({ error: 'Aplicación no encontrada' });
        }

        res.json({
            ...apps[0],
            respuestas_json: JSON.parse(apps[0].respuestas_json),
            puntuacion_por_seccion: JSON.parse(apps[0].puntuacion_por_seccion || '{}')
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener aplicación' });
    }
});

module.exports = router;