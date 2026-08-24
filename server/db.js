const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'society.db');
const dataDir = path.join(__dirname, 'data');

let db = null;

/**
 * Save the database to disk
 */
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Initialize the database, run migrations, and seed data
 */
async function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run migrations
  migrate();
  // Seed initial data
  seed();
  // Save to disk
  saveDb();

  // Auto-save every 30 seconds
  setInterval(saveDb, 30000);

  return db;
}

/**
 * Get the database instance
 */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// ─── Helper: run query and return all rows as objects ─────────────────
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ─── Helper: run query and return first row as object ────────────────
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ─── Helper: run an insert/update/delete and return info ─────────────
function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
  const changes = db.getRowsModified();
  saveDb();
  return { lastInsertRowid: lastId, changes };
}

// ─── Helper: execute raw SQL (for schema) ────────────────────────────
function exec(sql) {
  db.exec(sql);
  saveDb();
}

// ─── Schema Migration ────────────────────────────────────────────────
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'resident',
      apartment_no  TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      resident_id   INTEGER NOT NULL REFERENCES users(id),
      category      TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL,
      photo_url     TEXT,
      priority      TEXT DEFAULT 'Medium',
      status        TEXT DEFAULT 'Open',
      is_overdue    INTEGER DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at   DATETIME
    );

    CREATE TABLE IF NOT EXISTS complaint_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id  INTEGER NOT NULL REFERENCES complaints(id),
      old_status    TEXT,
      new_status    TEXT NOT NULL,
      changed_by    INTEGER NOT NULL REFERENCES users(id),
      note          TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      content       TEXT NOT NULL,
      is_important  INTEGER DEFAULT 0,
      posted_by     INTEGER NOT NULL REFERENCES users(id),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Create indexes (ignore errors if they already exist)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id)',
    'CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)',
    'CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)',
    'CREATE INDEX IF NOT EXISTS idx_complaints_overdue ON complaints(is_overdue)',
    'CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_history(complaint_id)',
    'CREATE INDEX IF NOT EXISTS idx_notices_important ON notices(is_important)',
  ];
  for (const idx of indexes) {
    try { db.exec(idx); } catch (e) { /* ignore */ }
  }
}

// ─── Seed Data ───────────────────────────────────────────────────────
function seed() {
  const countResult = db.exec("SELECT COUNT(*) as count FROM users");
  const userCount = countResult[0]?.values[0][0] || 0;
  if (userCount > 0) return;

  console.log('🌱 Seeding database with initial data...');

  const adminHash = bcrypt.hashSync('admin123', 10);
  const residentHash = bcrypt.hashSync('password123', 10);

  db.run("INSERT INTO users (name, email, password_hash, role, apartment_no) VALUES (?, ?, ?, ?, ?)",
    ['Admin', 'admin@society.com', adminHash, 'admin', null]);
  const adminId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  db.run("INSERT INTO users (name, email, password_hash, role, apartment_no) VALUES (?, ?, ?, ?, ?)",
    ['John Doe', 'john@resident.com', residentHash, 'resident', 'A-101']);
  const residentId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  db.run("INSERT INTO users (name, email, password_hash, role, apartment_no) VALUES (?, ?, ?, ?, ?)",
    ['Jane Smith', 'jane@resident.com', residentHash, 'resident', 'B-205']);
  const resident2Id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  // Sample complaints
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

  db.run(`INSERT INTO complaints (resident_id, category, title, description, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [residentId, 'Plumbing', 'Kitchen Sink Leaking',
     'The kitchen sink has been leaking steadily for the past two days. Water is pooling under the cabinet and may cause damage to the flooring.',
     'High', 'Open', daysAgo(10)]);
  const c1Id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  db.run(`INSERT INTO complaints (resident_id, category, title, description, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [residentId, 'Electrical', 'Corridor Light Not Working',
     'The light in the 3rd floor corridor near apartment A-101 has been out for a week. It is very dark at night and poses a safety hazard.',
     'Medium', 'In Progress', daysAgo(5)]);
  const c2Id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  db.run(`INSERT INTO complaints (resident_id, category, title, description, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [resident2Id, 'Elevator', 'Elevator Making Strange Noise',
     'The elevator in Block B has been making a grinding noise when moving between floors 2 and 3. This has been happening for about 3 days.',
     'High', 'Open', daysAgo(3)]);
  const c3Id = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];

  // Complaint history
  db.run("INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [c1Id, null, 'Open', residentId, 'Complaint created', daysAgo(10)]);
  db.run("INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [c2Id, null, 'Open', residentId, 'Complaint created', daysAgo(5)]);
  db.run("INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [c2Id, 'Open', 'In Progress', adminId, 'Assigned to maintenance team', daysAgo(3)]);
  db.run("INSERT INTO complaint_history (complaint_id, old_status, new_status, changed_by, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [c3Id, null, 'Open', resident2Id, 'Complaint created', daysAgo(3)]);

  // Sample notices
  db.run("INSERT INTO notices (title, content, is_important, posted_by, created_at) VALUES (?, ?, ?, ?, ?)",
    ['Water Supply Maintenance',
     'Water supply will be interrupted on Sunday, August 25th from 10 AM to 2 PM for routine tank cleaning and pipeline maintenance. Please store sufficient water in advance.',
     1, adminId, daysAgo(2)]);
  db.run("INSERT INTO notices (title, content, is_important, posted_by, created_at) VALUES (?, ?, ?, ?, ?)",
    ['Monthly Society Meeting',
     'The monthly society meeting will be held on August 30th at 7 PM in the community hall. All residents are requested to attend. Agenda includes discussion on parking allocation and festival planning.',
     0, adminId, daysAgo(1)]);

  // Default settings
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['overdue_days', '7']);

  console.log('✅ Database seeded successfully');
  console.log('   Admin: admin@society.com / admin123');
  console.log('   Resident: john@resident.com / password123');
  console.log('   Resident: jane@resident.com / password123');
}

module.exports = { initDb, getDb, all, get, run, exec, saveDb };
