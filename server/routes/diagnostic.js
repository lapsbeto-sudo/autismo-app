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

// Listar evaluaciones diagnósticas de un paciente
router.get('/patient/:patientId', [
    param('patientId').isInt()
], (req, res) => {
    try {
        const evals = queryDb(`
            SELECT de.*, u.nombre as doctor_nombre, u.apellido as doctor_apellido
            FROM diagnostic_evaluations de
            JOIN users u ON de.user_id = u.id
            WHERE de.patient_id = ? AND de.user_id = ?
            ORDER BY de.fecha_evaluacion DESC
        `, [req.params.patientId, req.user.id]);

        res.json(evals);
    } catch (error) {
        console.error('Error al obtener evaluaciones:', error);
        res.status(500).json({ error: 'Error al obtener evaluaciones diagnósticas' });
    }
});

// Obtener evaluación por ID
router.get('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const evals = queryDb(`
            SELECT de.*, u.nombre as doctor_nombre, u.apellido as doctor_apellido,
                   p.nombre as patient_nombre, p.apellido as patient_apellido,
                   p.fecha_nacimiento, p.sexo
            FROM diagnostic_evaluations de
            JOIN users u ON de.user_id = u.id
            JOIN patients p ON de.patient_id = p.id
            WHERE de.id = ? AND de.user_id = ?
        `, [req.params.id, req.user.id]);

        if (evals.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }

        res.json(evals[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener evaluación' });
    }
});

// Crear evaluación diagnóstica
router.post('/', [
    body('patient_id').isInt().withMessage('ID de paciente requerido'),
    body('instrumento').notEmpty().withMessage('Instrumento requerido'),
    body('fecha_evaluacion').optional(),
    body('edad_evaluacion').optional(),
    body('area_evaluada').optional(),
    body('resultado').optional(),
    body('nivel_gravedad').optional().isIn(['nivel_1', 'nivel_2', 'nivel_3', 'no_aplica']),
    body('observaciones').optional(),
    body('recomendaciones').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            patient_id, instrumento, fecha_evaluacion, edad_evaluacion,
            area_evaluada, resultado, nivel_gravedad, observaciones, recomendaciones
        } = req.body;

        // Verificar que el paciente existe
        const patients = queryDb('SELECT id FROM patients WHERE id = ? AND user_id = ?', [patient_id, req.user.id]);
        if (patients.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const result = runDb(
            `INSERT INTO diagnostic_evaluations (
                patient_id, user_id, instrumento, fecha_evaluacion,
                edad_evaluacion, area_evaluada, resultado,
                nivel_gravedad, observaciones, recomendaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patient_id, req.user.id, instrumento,
                fecha_evaluacion || new Date().toISOString().split('T')[0],
                edad_evaluacion || null, area_evaluada || null,
                resultado || null, nivel_gravedad || null,
                observaciones || null, recomendaciones || null
            ]
        );

        const newEval = queryDb('SELECT * FROM diagnostic_evaluations WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Evaluación diagnóstica registrada exitosamente',
            evaluation: newEval[0]
        });
    } catch (error) {
        console.error('Error al crear evaluación:', error);
        res.status(500).json({ error: 'Error al crear evaluación diagnóstica' });
    }
});

// Actualizar evaluación diagnóstica
router.put('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM diagnostic_evaluations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }

        const fields = [];
        const values = [];

        const allowedFields = [
            'instrumento', 'fecha_evaluacion', 'edad_evaluacion',
            'area_evaluada', 'resultado', 'nivel_gravedad',
            'observaciones', 'recomendaciones'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        fields.push('modified_at = datetime("now")');
        values.push(req.params.id);

        runDb(`UPDATE diagnostic_evaluations SET ${fields.join(', ')} WHERE id = ?`, values);

        const updated = queryDb('SELECT * FROM diagnostic_evaluations WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Evaluación actualizada exitosamente',
            evaluation: updated[0]
        });
    } catch (error) {
        console.error('Error al actualizar evaluación:', error);
        res.status(500).json({ error: 'Error al actualizar evaluación' });
    }
});

// Eliminar evaluación diagnóstica
router.delete('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM diagnostic_evaluations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }

        runDb('DELETE FROM diagnostic_evaluations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        res.json({ message: 'Evaluación eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar evaluación' });
    }
});

module.exports = router;