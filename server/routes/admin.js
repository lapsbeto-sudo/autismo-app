const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

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

// ===== GESTIÓN DE TESTS =====

// Listar todos los tests (incluyendo inactivos)
router.get('/tests', (req, res) => {
    try {
        const tests = queryDb('SELECT * FROM tests ORDER BY nombre');
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tests' });
    }
});

// Obtener test con sus ítems
router.get('/tests/:id', [
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

// Crear nuevo test
router.post('/tests', [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('codigo').notEmpty().withMessage('Código requerido'),
    body('edad_min_meses').isInt().withMessage('Edad mínima requerida'),
    body('edad_max_meses').isInt().withMessage('Edad máxima requerida'),
    body('metodo_aplicacion').isIn(['autoadmin', 'observacion', 'entrevista']).withMessage('Método inválido'),
    body('descripcion').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion } = req.body;

        // Verificar que el código no exista
        const existing = queryDb('SELECT id FROM tests WHERE codigo = ?', [codigo]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Ya existe un test con ese código' });
        }

        const result = runDb(
            `INSERT INTO tests (nombre, codigo, descripcion, edad_min_meses, edad_max_meses, metodo_aplicacion)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, codigo, descripcion || null, edad_min_meses, edad_max_meses, metodo_aplicacion]
        );

        const newTest = queryDb('SELECT * FROM tests WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Test creado exitosamente',
            test: newTest[0]
        });
    } catch (error) {
        console.error('Error al crear test:', error);
        res.status(500).json({ error: 'Error al crear test' });
    }
});

// Actualizar test
router.put('/tests/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM tests WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Test no encontrado' });
        }

        const fields = [];
        const values = [];

        const allowedFields = ['nombre', 'codigo', 'descripcion', 'edad_min_meses', 'edad_max_meses', 'metodo_aplicacion', 'activo'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        values.push(req.params.id);

        runDb(`UPDATE tests SET ${fields.join(', ')} WHERE id = ?`, values);

        const updated = queryDb('SELECT * FROM tests WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Test actualizado exitosamente',
            test: updated[0]
        });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Ya existe un test con ese código' });
        }
        console.error('Error al actualizar test:', error);
        res.status(500).json({ error: 'Error al actualizar test' });
    }
});

// Eliminar test (soft delete - desactivar)
router.delete('/tests/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM tests WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Test no encontrado' });
        }

        runDb('UPDATE tests SET activo = 0 WHERE id = ?', [req.params.id]);

        res.json({ message: 'Test desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar test' });
    }
});

// ===== GESTIÓN DE ÍTEMS =====

// Agregar ítem a un test
router.post('/tests/:testId/items', [
    param('testId').isInt(),
    body('texto').notEmpty().withMessage('Texto del ítem requerido'),
    body('orden').isInt().withMessage('Orden requerido'),
    body('tipo_respuesta').isIn(['si_no', 'Likert_4', 'Likert_5', 'opcion_multiple', 'escala']).withMessage('Tipo de respuesta inválido'),
    body('seccion').optional(),
    body('opciones_json').optional(),
    body('peso_puntos').optional().isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { testId } = req.params;
        const { texto, orden, tipo_respuesta, seccion, opciones_json, peso_puntos } = req.body;

        // Verificar que el test existe
        const test = queryDb('SELECT id FROM tests WHERE id = ?', [testId]);
        if (test.length === 0) {
            return res.status(404).json({ error: 'Test no encontrado' });
        }

        const result = runDb(
            `INSERT INTO test_items (test_id, texto, orden, tipo_respuesta, seccion, opciones_json, peso_puntos)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [testId, texto, orden, tipo_respuesta, seccion || null, opciones_json || null, peso_puntos || 1]
        );

        const newItem = queryDb('SELECT * FROM test_items WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({
            message: 'Ítem agregado exitosamente',
            item: newItem[0]
        });
    } catch (error) {
        console.error('Error al agregar ítem:', error);
        res.status(500).json({ error: 'Error al agregar ítem' });
    }
});

// Actualizar ítem
router.put('/items/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM test_items WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Ítem no encontrado' });
        }

        const fields = [];
        const values = [];

        const allowedFields = ['texto', 'orden', 'tipo_respuesta', 'seccion', 'opciones_json', 'peso_puntos'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        values.push(req.params.id);

        runDb(`UPDATE test_items SET ${fields.join(', ')} WHERE id = ?`, values);

        const updated = queryDb('SELECT * FROM test_items WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Ítem actualizado exitosamente',
            item: updated[0]
        });
    } catch (error) {
        console.error('Error al actualizar ítem:', error);
        res.status(500).json({ error: 'Error al actualizar ítem' });
    }
});

// Eliminar ítem
router.delete('/items/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM test_items WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Ítem no encontrado' });
        }

        runDb('DELETE FROM test_items WHERE id = ?', [req.params.id]);

        res.json({ message: 'Ítem eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar ítem' });
    }
});

// Obtener estadísticas
router.get('/stats', (req, res) => {
    try {
        const totalPatients = queryDb('SELECT COUNT(*) as count FROM users WHERE id IN (SELECT user_id FROM patients)');
        const totalTests = queryDb('SELECT COUNT(*) as count FROM tests WHERE activo = 1');
        const totalApplications = queryDb('SELECT COUNT(*) as count FROM test_applications');
        const riskDistribution = queryDb(`
            SELECT nivel_riesgo, COUNT(*) as count 
            FROM test_applications 
            GROUP BY nivel_riesgo
        `);

        res.json({
            totalPatients: totalPatients[0]?.count || 0,
            totalTests: totalTests[0]?.count || 0,
            totalApplications: totalApplications[0]?.count || 0,
            riskDistribution
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// ===== GESTIÓN DE USUARIOS =====

// Listar todos los usuarios
router.get('/users', (req, res) => {
    try {
        const users = queryDb(`
            SELECT id, nombre, apellido, email, especialidad, rol, activo, created_at,
                   (SELECT COUNT(*) FROM patients WHERE user_id = users.id) as total_patientes
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Obtener usuario específico
router.get('/users/:id', [
    param('id').isInt()
], (req, res) => {
    try {
        const users = queryDb(`
            SELECT id, nombre, apellido, email, especialidad, rol, activo, created_at
            FROM users WHERE id = ?
        `, [req.params.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// Actualizar usuario
router.put('/users/:id', requireAdmin, [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // No permitir desactivarse a sí mismo
        if (parseInt(req.params.id) === req.user.id && req.body.activo === 0) {
            return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
        }

        const fields = [];
        const values = [];
        const allowedFields = ['nombre', 'apellido', 'email', 'especialidad', 'rol', 'activo'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        values.push(req.params.id);
        runDb(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        const updated = queryDb(`
            SELECT id, nombre, apellido, email, especialidad, rol, activo, created_at
            FROM users WHERE id = ?
        `, [req.params.id]);

        res.json({
            message: 'Usuario actualizado exitosamente',
            user: updated[0]
        });
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'El email ya está en uso' });
        }
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Desactivar usuario (soft delete)
router.delete('/users/:id', requireAdmin, [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // No permitir desactivarse a sí mismo
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
        }

        runDb('UPDATE users SET activo = 0 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar usuario' });
    }
});

// Reactivar usuario
router.put('/users/:id/activate', requireAdmin, [
    param('id').isInt()
], (req, res) => {
    try {
        const existing = queryDb('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        runDb('UPDATE users SET activo = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Usuario reactivado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al reactivar usuario' });
    }
});

// Restablecer contraseña
router.put('/users/:id/reset-password', requireAdmin, [
    param('id').isInt(),
    body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const existing = queryDb('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        runDb('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.params.id]);

        res.json({ message: 'Contraseña restablecida exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al restablecer contraseña' });
    }
});

module.exports = router;