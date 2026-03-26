'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'penger.db');

let db;

function init() {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    db = new Database(DB_PATH);
  } catch (e) {
    console.warn('[db] better-sqlite3 native module not available — payment features disabled');
    const noop = () => {};
    const stmt = { run: () => ({ changes: 0 }), get: () => undefined, all: () => [], bind() { return this; } };
    db = { prepare: () => stmt, exec: noop, pragma: () => [], transaction: fn => fn, close: noop };
    return db;
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_invoices (
      id                    TEXT PRIMARY KEY,
      order_id              TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'quoted',
      amount_eur            INTEGER NOT NULL,
      asset                 TEXT NOT NULL,
      amount_crypto         TEXT NOT NULL,
      amount_raw            TEXT NOT NULL,
      rate                  TEXT NOT NULL,
      recipient             TEXT NOT NULL,
      recipient_ata         TEXT,
      reference             TEXT NOT NULL UNIQUE,
      memo                  TEXT,
      mint_address          TEXT,
      token_program         TEXT,
      payer_wallet          TEXT,
      tx_signature          TEXT,
      tx_slot               INTEGER,
      tx_block_time         INTEGER,
      order_data            TEXT,
      expires_at            INTEGER NOT NULL,
      created_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at            INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS payment_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  TEXT NOT NULL REFERENCES payment_invoices(id),
      event       TEXT NOT NULL,
      data        TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_status ON payment_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_reference ON payment_invoices(reference);
    CREATE INDEX IF NOT EXISTS idx_events_invoice ON payment_events(invoice_id);
  `);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  return db;
}

module.exports = { init, getDb };
