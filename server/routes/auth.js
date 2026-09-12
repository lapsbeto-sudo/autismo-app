require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../config/database');
const { JWT_SECRET, authenticateToken, addToBlacklist } = require('../middleware/auth');

const router = express.Router();

// Rate limiting para login
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Helper function to query database
function queryDb(sql, params = []) {
    const db = getDb();
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (error) {
        throw error;
    }
}

function runDb(sql, params = []) {
    const db = getDb();
    db.run(sql, params);
    const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
    return { lastInsertRowid: lastId };
}

// Registro de usuario
router.post('/register', [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('apellido').notEmpty().withMessage('Apellido requerido'),
    body('email').isEmail().withMessage('Email válido requerido'),
    body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    body('especialidad').optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nombre, apellido, email, password, especialidad } = req.body;

        const existingUser = queryDb('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = runDb(
            'INSERT INTO users (nombre, apellido, email, password_hash, especialidad) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, email, password_hash, especialidad || 'Psicología Clínica']
        );

        const token = jwt.sign(
            { id: result.lastInsertRowid, email, rol: 'psicologo' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: result.lastInsertRowid,
                nombre,
                apellido,
                email,
                rol: 'psicologo'
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Login con rate limiting
router.post('/login', loginLimiter, [
    body('email').isEmail().withMessage('Email válido requerido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const users = queryDb('SELECT * FROM users WHERE email = ? AND activo = 1', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, rol: user.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol,
                especialidad: user.especialidad
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Logout - revocar token
router.post('/logout', authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        // Calcular expiración del token (24h)
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
        addToBlacklist(token, expiresAt);
    }
    
    res.json({ message: 'Sesión cerrada exitosamente' });
});

// Obtener perfil del usuario autenticado
router.get('/profile', authenticateToken, (req, res) => {
    try {
        const users = queryDb('SELECT id, nombre, apellido, email, especialidad, rol, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

module.exports = router;
