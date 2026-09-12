require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('ERROR: JWT_SECRET no está configurado en .env');
    console.error('Generar uno con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}

// Token blacklist (in-memory con TTL)
const tokenBlacklist = new Map();

// Limpiar tokens expirados cada 10 minutos
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of tokenBlacklist.entries()) {
        if (now > expiry) {
            tokenBlacklist.delete(token);
        }
    }
}, 10 * 60 * 1000);

const addToBlacklist = (token, expiresAt) => {
    tokenBlacklist.set(token, expiresAt);
};

const isBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    if (isBlacklisted(token)) {
        return res.status(401).json({ error: 'Token revocado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin, JWT_SECRET, addToBlacklist, isBlacklisted };
