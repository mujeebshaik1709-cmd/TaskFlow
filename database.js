const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "taskflow.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ─── Create Tables ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    color     TEXT NOT NULL DEFAULT '#3B82F6',
    icon      TEXT NOT NULL DEFAULT '📁',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS main_tasks (
    id          TEXT PRIMARY KEY,
    ws_id       TEXT NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'NOT_STARTED',
    priority    TEXT NOT NULL DEFAULT 'MEDIUM',
    start_date  TEXT NOT NULL,
    deadline    TEXT NOT NULL,
    notes       TEXT DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (ws_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS sub_tasks (
    id          TEXT PRIMARY KEY,
    mt_id       TEXT NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'NOT_STARTED',
    priority    TEXT NOT NULL DEFAULT 'MEDIUM',
    start_date  TEXT NOT NULL,
    deadline    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mt_id) REFERENCES main_tasks(id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    record_title TEXT,
    action      TEXT NOT NULL,
    old_data    TEXT,
    new_data    TEXT,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Seed default data if empty ───────────────────────────────────────────────
const wsCount = db.prepare("SELECT COUNT(*) as c FROM workspaces").get();
if (wsCount.c === 0) {
  const insertWs   = db.prepare("INSERT INTO workspaces (id,name,color,icon) VALUES (?,?,?,?)");
  const insertMt   = db.prepare("INSERT INTO main_tasks (id,ws_id,title,status,priority,start_date,deadline) VALUES (?,?,?,?,?,?,?)");
  const insertSt   = db.prepare("INSERT INTO sub_tasks  (id,mt_id,title,status,priority,start_date,deadline) VALUES (?,?,?,?,?,?,?)");

  const seedAll = db.transaction(() => {
    insertWs.run("ws1","GPMS 2.0","#3B82F6","⚡");
    insertWs.run("ws2","ICT Projects","#A855F7","💻");
    insertWs.run("ws3","Learning & Dev","#10B981","📚");

    insertMt.run("mt1","ws1","GM Department Setup","IN_PROGRESS","HIGH","2026-05-01","2026-06-30");
    insertMt.run("mt2","ws1","NTF Module Integration","DELAYED","CRITICAL","2026-04-10","2026-06-10");
    insertMt.run("mt3","ws1","Baseline Demo Prep","REVIEW","MEDIUM","2026-06-05","2026-07-05");
    insertMt.run("mt4","ws1","UAT Bug Resolution","IN_PROGRESS","HIGH","2026-06-01","2026-07-15");
    insertMt.run("mt5","ws1","SaaS Migration Planning","NOT_STARTED","MEDIUM","2026-07-01","2026-09-30");
    insertMt.run("mt6","ws2","SCADA Integration","NOT_STARTED","HIGH","2026-07-01","2026-09-30");
    insertMt.run("mt7","ws2","Network Infrastructure","IN_PROGRESS","MEDIUM","2026-05-15","2026-08-20");
    insertMt.run("mt8","ws3","SQL Learning Track","IN_PROGRESS","MEDIUM","2026-05-01","2026-07-31");
    insertMt.run("mt9","ws3","Power BI Fundamentals","NOT_STARTED","LOW","2026-08-01","2026-10-31");

    insertSt.run("st1","mt1","Data Cleansing","COMPLETED","HIGH","2026-05-01","2026-05-31");
    insertSt.run("st2","mt1","Template Configuration","IN_PROGRESS","HIGH","2026-06-01","2026-06-20");
    insertSt.run("st3","mt1","UAT Testing","NOT_STARTED","MEDIUM","2026-06-20","2026-06-30");
    insertSt.run("st4","mt2","Land Acquisition Form","DELAYED","CRITICAL","2026-04-10","2026-05-15");
    insertSt.run("st5","mt2","Design Review","IN_PROGRESS","HIGH","2026-05-15","2026-06-10");
    insertSt.run("st6","mt3","PPT Deck","COMPLETED","MEDIUM","2026-06-05","2026-06-15");
    insertSt.run("st7","mt3","Live Demo Setup","REVIEW","MEDIUM","2026-06-15","2026-07-05");
    insertSt.run("st8","mt4","Module A Bugs","IN_PROGRESS","HIGH","2026-06-01","2026-06-30");
    insertSt.run("st9","mt4","Module B Bugs","NOT_STARTED","MEDIUM","2026-06-20","2026-07-15");
    insertSt.run("st10","mt8","SELECT & Filtering","COMPLETED","MEDIUM","2026-05-01","2026-05-20");
    insertSt.run("st11","mt8","JOINs & Aggregation","IN_PROGRESS","MEDIUM","2026-05-20","2026-06-30");
    insertSt.run("st12","mt8","Subqueries & CTEs","NOT_STARTED","LOW","2026-07-01","2026-07-31");
  });
  seedAll();
  console.log("✅ Database seeded with default data.");
}

// ─── Audit log helper ─────────────────────────────────────────────────────────
function logAudit(tableName, recordId, recordTitle, action, oldData, newData) {
  db.prepare(`
    INSERT INTO audit_log (table_name, record_id, record_title, action, old_data, new_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tableName, recordId, recordTitle, action,
    oldData  ? JSON.stringify(oldData)  : null,
    newData  ? JSON.stringify(newData)  : null
  );
}

module.exports = { db, logAudit };
