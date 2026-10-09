'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');
const collections = ['employees', 'users', 'movements', 'payments', 'periods', 'events', 'audit'];

class Store {
  constructor(filename) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename, { timeout: 5000 });
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
      INSERT OR IGNORE INTO metadata VALUES ('revision', '0');
    `);
  }

  revision() { return Number(this.db.prepare("SELECT value FROM metadata WHERE key='revision'").get().value); }
  initialized() { return !!this.db.prepare("SELECT 1 FROM records WHERE kind='users' LIMIT 1").get(); }

  read() {
    const data = { schemaVersion: 1 };
    for (const kind of collections) data[kind] = [];
    for (const row of this.db.prepare('SELECT kind,payload FROM records ORDER BY rowid').all()) data[row.kind].push(JSON.parse(row.payload));
    const settings = this.db.prepare("SELECT value FROM metadata WHERE key='settings'").get();
    data.settings = settings ? JSON.parse(settings.value) : {};
    return data;
  }

  save(data, expectedRevision) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.revision() !== expectedRevision) throw Object.assign(new Error('Los datos cambiaron. Revisa los importes y vuelve a guardar.'), { status: 409 });
      const insert = this.db.prepare('INSERT INTO records(kind,id,payload) VALUES (?,?,?)');
      this.db.exec('DELETE FROM records');
      for (const kind of collections) for (const record of data[kind]) insert.run(kind, record.id, JSON.stringify(record));
      this.db.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES ('settings',?)").run(JSON.stringify(data.settings));
      this.db.prepare("UPDATE metadata SET value=? WHERE key='revision'").run(String(expectedRevision + 1));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  createSession(hash, userId, expires) {
    this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash, userId, expires);
  }
  session(hash) { return this.db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(hash, Date.now()); }
  revoke(hash) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash); }
  revokeUser(userId) { this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); }
  backup(filename) { return backup(this.db, filename); }
  close() { this.db.close(); }
}

module.exports = { Store };
