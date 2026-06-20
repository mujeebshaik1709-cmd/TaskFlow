const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { db, logAudit } = require("./database");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve built React app
app.use(express.static(path.join(__dirname, "public")));

// ─── Helper ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ═══════════════════════════════════════════════════════════
// WORKSPACES
// ═══════════════════════════════════════════════════════════
app.get("/api/workspaces", (req, res) => {
  const rows = db.prepare("SELECT * FROM workspaces ORDER BY created_at ASC").all();
  res.json(rows);
});

app.post("/api/workspaces", (req, res) => {
  const { name, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const id = "ws" + uid();
  db.prepare("INSERT INTO workspaces (id,name,color,icon) VALUES (?,?,?,?)").run(id, name, color || "#3B82F6", icon || "📁");
  const row = db.prepare("SELECT * FROM workspaces WHERE id=?").get(id);
  logAudit("workspaces", id, name, "CREATE", null, row);
  res.json(row);
});

app.delete("/api/workspaces/:id", (req, res) => {
  const { id } = req.params;
  const ws = db.prepare("SELECT * FROM workspaces WHERE id=?").get(id);
  if (!ws) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM workspaces WHERE id=?").run(id);
  logAudit("workspaces", id, ws.name, "DELETE", ws, null);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// MAIN TASKS
// ═══════════════════════════════════════════════════════════
app.get("/api/tasks", (req, res) => {
  const { wsId } = req.query;
  const rows = wsId
    ? db.prepare("SELECT * FROM main_tasks WHERE ws_id=? ORDER BY created_at ASC").all(wsId)
    : db.prepare("SELECT * FROM main_tasks ORDER BY created_at ASC").all();
  res.json(rows);
});

app.post("/api/tasks", (req, res) => {
  const { wsId, title, status, priority, startDate, deadline, notes } = req.body;
  if (!wsId || !title) return res.status(400).json({ error: "wsId and title required" });
  const id = "mt" + uid();
  db.prepare(`
    INSERT INTO main_tasks (id,ws_id,title,status,priority,start_date,deadline,notes)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, wsId, title, status || "NOT_STARTED", priority || "MEDIUM", startDate, deadline, notes || "");
  const row = db.prepare("SELECT * FROM main_tasks WHERE id=?").get(id);
  logAudit("main_tasks", id, title, "CREATE", null, row);
  res.json(row);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const old = db.prepare("SELECT * FROM main_tasks WHERE id=?").get(id);
  if (!old) return res.status(404).json({ error: "Not found" });

  const { title, status, priority, startDate, deadline, notes, wsId } = req.body;
  db.prepare(`
    UPDATE main_tasks SET
      title      = COALESCE(?, title),
      status     = COALESCE(?, status),
      priority   = COALESCE(?, priority),
      start_date = COALESCE(?, start_date),
      deadline   = COALESCE(?, deadline),
      notes      = COALESCE(?, notes),
      ws_id      = COALESCE(?, ws_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, status, priority, startDate, deadline, notes, wsId, id);

  const updated = db.prepare("SELECT * FROM main_tasks WHERE id=?").get(id);
  logAudit("main_tasks", id, updated.title, "UPDATE", old, updated);
  res.json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const old = db.prepare("SELECT * FROM main_tasks WHERE id=?").get(id);
  if (!old) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM sub_tasks WHERE mt_id=?").run(id);
  db.prepare("DELETE FROM main_tasks WHERE id=?").run(id);
  logAudit("main_tasks", id, old.title, "DELETE", old, null);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// SUB TASKS
// ═══════════════════════════════════════════════════════════
app.get("/api/subtasks", (req, res) => {
  const { mtId } = req.query;
  const rows = mtId
    ? db.prepare("SELECT * FROM sub_tasks WHERE mt_id=? ORDER BY created_at ASC").all(mtId)
    : db.prepare("SELECT * FROM sub_tasks ORDER BY created_at ASC").all();
  res.json(rows);
});

app.post("/api/subtasks", (req, res) => {
  const { mtId, title, status, priority, startDate, deadline } = req.body;
  if (!mtId || !title) return res.status(400).json({ error: "mtId and title required" });
  const id = "st" + uid();
  db.prepare(`
    INSERT INTO sub_tasks (id,mt_id,title,status,priority,start_date,deadline)
    VALUES (?,?,?,?,?,?,?)
  `).run(id, mtId, title, status || "NOT_STARTED", priority || "MEDIUM", startDate, deadline);
  const row = db.prepare("SELECT * FROM sub_tasks WHERE id=?").get(id);
  logAudit("sub_tasks", id, title, "CREATE", null, row);
  res.json(row);
});

app.put("/api/subtasks/:id", (req, res) => {
  const { id } = req.params;
  const old = db.prepare("SELECT * FROM sub_tasks WHERE id=?").get(id);
  if (!old) return res.status(404).json({ error: "Not found" });

  const { title, status, priority, startDate, deadline } = req.body;
  db.prepare(`
    UPDATE sub_tasks SET
      title      = COALESCE(?, title),
      status     = COALESCE(?, status),
      priority   = COALESCE(?, priority),
      start_date = COALESCE(?, start_date),
      deadline   = COALESCE(?, deadline),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, status, priority, startDate, deadline, id);

  const updated = db.prepare("SELECT * FROM sub_tasks WHERE id=?").get(id);
  logAudit("sub_tasks", id, updated.title, "UPDATE", old, updated);
  res.json(updated);
});

app.delete("/api/subtasks/:id", (req, res) => {
  const { id } = req.params;
  const old = db.prepare("SELECT * FROM sub_tasks WHERE id=?").get(id);
  if (!old) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM sub_tasks WHERE id=?").run(id);
  logAudit("sub_tasks", id, old.title, "DELETE", old, null);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// AUDIT / HISTORY
// ═══════════════════════════════════════════════════════════
app.get("/api/history", (req, res) => {
  const { limit = 100 } = req.query;
  const rows = db.prepare(`
    SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?
  `).all(Number(limit));
  res.json(rows);
});

// ═══════════════════════════════════════════════════════════
// FALLBACK — serve React app for all other routes
// ═══════════════════════════════════════════════════════════
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   TaskFlow Server is running!        ║
  ║   Local:   http://localhost:${PORT}     ║
  ║   Network: http://YOUR-IP:${PORT}      ║
  ╚══════════════════════════════════════╝
  `);
});
