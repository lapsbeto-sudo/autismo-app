const { getDb, saveDatabase } = require('../config/database');

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
    saveDatabase();
    return { lastInsertRowid: lastId };
}

module.exports = { queryDb, runDb };
