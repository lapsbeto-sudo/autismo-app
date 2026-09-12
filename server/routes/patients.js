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

// Listar pacientes con filtros
router.get('/', (req, res) => {
    try {
        const { search, sexo, edad_min, edad_max, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE user_id = ?';
        let countWhere = 'WHERE user_id = ?';
        const params = [req.user.id];
        const countParams = [req.user.id];

        if (search) {
            const searchClause = ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ?)';
            whereClause += searchClause;
            countWhere += searchClause;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }

        if (sexo) {
            whereClause += ' AND sexo = ?';
            countWhere += ' AND sexo = ?';
            params.push(sexo);
            countParams.push(sexo);
        }

        if (edad_min || edad_max) {
            constedadClause = " AND (strftime('%Y', 'now') - strftime('%Y', fecha_nacimiento)) BETWEEN ? AND ?";
            whereClause += edadClause;
            countWhere += edadClause;
            params.push(edad_min || 0, edad_max || 100);
            countParams.push(edad_min || 0, edad_max || 100);
        }

        const patients = queryDb(`SELECT * FROM patients ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
        const countResult = queryDb(`SELECT COUNT(*) as total FROM patients ${countWhere}`, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            patients,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al listar pacientes:', error);
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
});

// Obtener paciente por ID
router.get('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const patients = queryDb('SELECT * FROM patients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (patients.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        res.json(patients[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener paciente' });
    }
});

// Crear paciente
router.post('/', [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('apellido').notEmpty().withMessage('Apellido requerido'),
    body('fecha_nacimiento').notEmpty().withMessage('Fecha de nacimiento requerida'),
    body('sexo').isIn(['M', 'F']).withMessage('Sexo debe ser M o F')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            nombre, apellido, fecha_nacimiento, sexo, cedula,
            direccion, telefono_contacto, nombre_padre, nombre_madre,
            motivo_consulta, observaciones
        } = req.body;

        const result = runDb(
            `INSERT INTO patients (nombre, apellido, fecha_nacimiento, sexo, cedula,
                direccion, telefono_contacto, nombre_padre, nombre_madre,
                motivo_consulta, observaciones, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, apellido, fecha_nacimiento, sexo, cedula || null,
                direccion || null, telefono_contacto || null,
                nombre_padre || null, nombre_madre || null,
                motivo_consulta || null, observaciones || null, req.user.id
            ]
        );

        const newPatient = queryDb('SELECT * FROM patients WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Paciente creado exitosamente',
            patient: newPatient[0]
        });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'La cédula ya está registrada' });
        }
        console.error('Error al crear paciente:', error);
        res.status(500).json({ error: 'Error al crear paciente' });
    }
});

// Actualizar paciente
router.put('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM patients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const fields = [];
        const values = [];

        const allowedFields = [
            'nombre', 'apellido', 'fecha_nacimiento', 'sexo', 'cedula',
            'direccion', 'telefono_contacto', 'nombre_padre', 'nombre_madre',
            'motivo_consulta', 'observaciones'
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

        values.push(req.params.id, req.user.id);

        runDb(`UPDATE patients SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

        const updated = queryDb('SELECT * FROM patients WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Paciente actualizado exitosamente',
            patient: updated[0]
        });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'La cédula ya está registrada' });
        }
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ error: 'Error al actualizar paciente' });
    }
});

// Eliminar paciente
router.delete('/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM patients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        runDb('DELETE FROM patients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        res.json({ message: 'Paciente eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar paciente' });
    }
});

module.exports = router;