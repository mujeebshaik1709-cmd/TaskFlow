import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const TODAY_STR = new Date().toISOString().slice(0, 10);
const TODAY     = new Date(TODAY_STR + "T00:00:00");

const STATUSES = [
  { key:"NOT_STARTED", label:"Not Started", color:"#64748B", bg:"#F8FAFC" },
  { key:"IN_PROGRESS", label:"In Progress", color:"#3B82F6", bg:"#EFF6FF" },
  { key:"REVIEW",      label:"Review",      color:"#A855F7", bg:"#FAF5FF" },
  { key:"ON_HOLD",     label:"On Hold",     color:"#F97316", bg:"#FFF7ED" },
  { key:"DELAYED",     label:"Delayed",     color:"#EF4444", bg:"#FEF2F2" },
  { key:"COMPLETED",   label:"Completed",   color:"#10B981", bg:"#F0FDF4" },
];

const PRIORITIES = [
  { key:"CRITICAL", label:"Critical", color:"#EF4444", bg:"#FEF2F2" },
  { key:"HIGH",     label:"High",     color:"#F59E0B", bg:"#FFFBEB" },
  { key:"MEDIUM",   label:"Medium",   color:"#3B82F6", bg:"#EFF6FF" },
  { key:"LOW",      label:"Low",      color:"#64748B", bg:"#F8FAFC" },
];

const WS_COLORS = ["#3B82F6","#10B981","#F59E0B","#A855F7","#EF4444","#F97316","#06B6D4","#EC4899"];
const WS_ICONS  = ["⚡","💻","📚","🔧","🚀","🎯","📊","🏗️","🔌","📁"];

const getSt = k => STATUSES.find(s => s.key === k)  || STATUSES[0];
const getPr = k => PRIORITIES.find(p => p.key === k) || PRIORITIES[2];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const parseDate   = s => new Date(s + "T00:00:00");
const diffDays    = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const fmtShort    = s => parseDate(s).toLocaleDateString("en-MY", { day:"2-digit", month:"short" });
const fmtDateTime = s => new Date(s).toLocaleString("en-MY", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

const deadlineBadge = (deadline, status) => {
  if (status === "COMPLETED") return { label:"Done ✓",              color:"#10B981", bg:"#F0FDF4" };
  const days = diffDays(TODAY_STR, deadline);
  if (days < 0)  return { label:`${Math.abs(days)}d overdue`, color:"#EF4444", bg:"#FEF2F2" };
  if (days === 0)return { label:"Due today!",                  color:"#F97316", bg:"#FFF7ED" };
  if (days <= 7) return { label:`${days}d left`,               color:"#F59E0B", bg:"#FFFBEB" };
  return              { label:`${days}d left`,               color:"#10B981", bg:"#F0FDF4" };
};

// ═══════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════
const api = {
  get:    url            => fetch(url).then(r => r.json()),
  post:   (url, body)    => fetch(url, { method:"POST",   headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }).then(r => r.json()),
  put:    (url, body)    => fetch(url, { method:"PUT",    headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }).then(r => r.json()),
  delete: url            => fetch(url, { method:"DELETE" }).then(r => r.json()),
};

// ═══════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════
const Pill = ({ children, color, bg }) => (
  <span style={{ fontSize:10, fontWeight:700, color, background:bg, padding:"2px 9px", borderRadius:20, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

// ═══════════════════════════════════════════════════════════
// TASK MODAL (add / edit)
// ═══════════════════════════════════════════════════════════
function TaskModal({ mode, wsId, mtId, workspaces, mainTasks, editData, onSave, onClose }) {
  const [form, setForm] = useState({
    title:     editData?.title      || "",
    status:    editData?.status     || "NOT_STARTED",
    priority:  editData?.priority   || "MEDIUM",
    startDate: editData?.start_date || TODAY_STR,
    deadline:  editData?.deadline   || "",
    wsId:      editData?.ws_id      || wsId || workspaces[0]?.id || "",
    mtId:      editData?.mt_id      || mtId || "",
    notes:     editData?.notes      || "",
  });
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.startDate && form.deadline;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.7)", zIndex:300,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"white", borderRadius:16, padding:28, width:460, maxHeight:"90vh",
        overflowY:"auto", boxShadow:"0 25px 60px rgba(0,0,0,.25)" }}>

        <div style={{ fontSize:15, fontWeight:800, color:"#0F172A", marginBottom:20 }}>
          {editData ? "✏️ Edit Task" : mode === "main" ? "➕ New Main Task" : "➕ New Sub Task"}
        </div>

        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>TITLE *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)}
          placeholder="Enter task title…"
          style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13,
            color:"#0F172A", background:"#F8FAFC", boxSizing:"border-box", marginBottom:14, outline:"none" }} />

        {mode === "main" && !editData && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>WORKSPACE</label>
            <select value={form.wsId} onChange={e => set("wsId", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC" }}>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.icon} {ws.name}</option>)}
            </select>
          </div>
        )}

        {mode === "sub" && !mtId && !editData && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>MAIN TASK</label>
            <select value={form.mtId} onChange={e => set("mtId", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC" }}>
              <option value="">Select main task…</option>
              {mainTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>STATUS</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC" }}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>PRIORITY</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC" }}>
              {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>START DATE</label>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>DEADLINE</label>
            <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC", boxSizing:"border-box" }} />
          </div>
        </div>

        {form.deadline && (
          <div style={{ marginBottom:16, padding:"9px 14px", background:"#F8FAFC", borderRadius:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, color:"#64748B", fontWeight:600 }}>Deadline Status:</span>
            {(() => { const b = deadlineBadge(form.deadline, form.status); return <Pill color={b.color} bg={b.bg}>{b.label}</Pill>; })()}
          </div>
        )}

        {mode === "main" && (
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>NOTES</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              placeholder="Optional notes…"
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0F172A", background:"#F8FAFC", boxSizing:"border-box", resize:"vertical", outline:"none" }} />
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"9px 20px", borderRadius:8, border:"1.5px solid #E2E8F0", background:"white", color:"#64748B", fontWeight:600, cursor:"pointer", fontSize:13 }}>
            Cancel
          </button>
          <button onClick={() => valid && onSave(form)}
            style={{ padding:"9px 22px", borderRadius:8, border:"none",
              background: valid ? "#0F172A" : "#CBD5E1", color:"white", fontWeight:700, cursor: valid ? "pointer" : "not-allowed", fontSize:13 }}>
            {editData ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WORKSPACE MODAL
// ═══════════════════════════════════════════════════════════
function WorkspaceModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [ci, setCi]     = useState(0);
  const valid = name.trim();
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.7)", zIndex:300,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"white", borderRadius:16, padding:28, width:380, boxShadow:"0 25px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#0F172A", marginBottom:20 }}>🗂️ New Workspace</div>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:4 }}>NAME *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Projects"
          style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13,
            color:"#0F172A", background:"#F8FAFC", boxSizing:"border-box", marginBottom:14, outline:"none" }} />
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:6 }}>ICON</label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
          {WS_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
              style={{ fontSize:18, padding:"4px 7px", borderRadius:8, cursor:"pointer",
                border: icon === ic ? "2px solid #0F172A" : "2px solid #E2E8F0",
                background: icon === ic ? "#F1F5F9" : "white" }}>{ic}</button>
          ))}
        </div>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748B", marginBottom:6 }}>COLOR</label>
        <div style={{ display:"flex", gap:8, marginBottom:22 }}>
          {WS_COLORS.map((c, i) => (
            <button key={i} onClick={() => setCi(i)}
              style={{ width:26, height:26, borderRadius:"50%", background:c, cursor:"pointer", padding:0, border:"none",
                outline: ci === i ? `3px solid ${c}` : "none", outlineOffset:2 }} />
          ))}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"9px 20px", borderRadius:8, border:"1.5px solid #E2E8F0", background:"white", color:"#64748B", fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={() => valid && onSave({ name: name.trim(), icon, color: WS_COLORS[ci] })}
            style={{ padding:"9px 22px", borderRadius:8, border:"none",
              background: valid ? "#0F172A" : "#CBD5E1", color:"white", fontWeight:700, cursor: valid ? "pointer" : "not-allowed" }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KANBAN VIEW
// ═══════════════════════════════════════════════════════════
function KanbanCard({ task, subs, onStatusChange, onAddSub, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const done   = subs.filter(s => s.status === "COMPLETED").length;
  const sInfo  = getSt(task.status);
  const pInfo  = getPr(task.priority);
  const dlInfo = deadlineBadge(task.deadline, task.status);

  return (
    <div style={{ background:"white", borderRadius:10, padding:"13px 14px", marginBottom:10,
      boxShadow:"0 1px 5px rgba(0,0,0,.08)", border:"1px solid #F1F5F9",
      borderLeft:`3px solid ${sInfo.color}` }}>

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:9, fontWeight:700, color:"#94A3B8" }}>{task.id.toUpperCase()}</span>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <Pill color={pInfo.color} bg={pInfo.bg}>{pInfo.label}</Pill>
          <button onClick={() => onEdit(task)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#94A3B8", padding:0 }}>✏️</button>
          <button onClick={() => onDelete(task.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#94A3B8", padding:0 }}>🗑️</button>
        </div>
      </div>

      <div style={{ fontWeight:700, fontSize:12.5, color:"#0F172A", marginBottom:8, lineHeight:1.4 }}>{task.title}</div>

      <div style={{ fontSize:10, color:"#94A3B8", marginBottom:6 }}>
        📅 {fmtShort(task.start_date)} → {fmtShort(task.deadline)}
      </div>

      <div style={{ marginBottom:8 }}>
        <Pill color={dlInfo.color} bg={dlInfo.bg}>⏱ {dlInfo.label}</Pill>
      </div>

      {subs.length > 0 && (
        <div style={{ marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ fontSize:9, color:"#94A3B8", fontWeight:600 }}>SUBTASKS</span>
            <span style={{ fontSize:9, fontWeight:700, color:"#0F172A" }}>{done}/{subs.length}</span>
          </div>
          <div style={{ height:4, background:"#F1F5F9", borderRadius:3 }}>
            <div style={{ height:4, borderRadius:3,
              background: done === subs.length ? "#10B981" : "#3B82F6",
              width:`${subs.length ? done / subs.length * 100 : 0}%`, transition:"width .3s" }} />
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:8 }}>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => onStatusChange(task.id, s.key)}
            style={{ fontSize:8, padding:"2px 7px", borderRadius:20, cursor:"pointer", fontWeight:700,
              border:`1px solid ${s.color}`,
              background: task.status === s.key ? s.color : "white",
              color: task.status === s.key ? "white" : s.color }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        borderTop:"1px solid #F8FAFC", paddingTop:7, marginTop:4 }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{ fontSize:10, color:"#64748B", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>
          {expanded ? "▾ Hide" : "▸ Subtasks"}{subs.length > 0 && ` (${subs.length})`}
        </button>
        <button onClick={onAddSub}
          style={{ fontSize:10, color:"#3B82F6", background:"#EFF6FF", border:"none", cursor:"pointer",
            fontWeight:700, padding:"3px 9px", borderRadius:20 }}>
          + Sub
        </button>
      </div>

      {expanded && subs.length > 0 && (
        <div style={{ marginTop:8, borderTop:"1px solid #F1F5F9", paddingTop:8 }}>
          {subs.map(sub => {
            const sd = deadlineBadge(sub.deadline, sub.status);
            return (
              <div key={sub.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid #F8FAFC" }}>
                <div style={{ width:6, height:6, borderRadius:1, background:getSt(sub.status).color, flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#374151", flex:1 }}>{sub.title}</span>
                <Pill color={sd.color} bg={sd.bg}>{sd.label}</Pill>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KanbanView({ mainTasks, subTasks, selectedWs, onStatusChange, onAddSub, onEdit, onDelete }) {
  const tasks = selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs);
  return (
    <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:16, minHeight:500 }}>
      {STATUSES.map(col => {
        const cards = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} style={{ minWidth:265, flex:"0 0 265px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:9, height:9, borderRadius:"50%", background:col.color }} />
              <span style={{ fontWeight:700, fontSize:12, color:"#0F172A" }}>{col.label}</span>
              <span style={{ marginLeft:"auto", background:col.color+"22", color:col.color,
                fontSize:10, fontWeight:700, padding:"1px 9px", borderRadius:20 }}>{cards.length}</span>
            </div>
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:10, minHeight:350 }}>
              {cards.length === 0 && <div style={{ textAlign:"center", color:"#CBD5E1", fontSize:11, paddingTop:50 }}>Empty</div>}
              {cards.map(t => (
                <KanbanCard key={t.id} task={t} subs={subTasks.filter(s => s.mt_id === t.id)}
                  onStatusChange={onStatusChange} onAddSub={() => onAddSub(t.id)}
                  onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GANTT VIEW
// ═══════════════════════════════════════════════════════════
function GanttView({ mainTasks, subTasks, selectedWs, workspaces }) {
  const tasks = selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs);
  const relSubs = subTasks.filter(s => tasks.find(t => t.id === s.mt_id));

  if (!tasks.length) return <div style={{ textAlign:"center", padding:60, color:"#94A3B8", fontSize:13 }}>No tasks to display.</div>;

  const allDates = [...tasks.map(t => t.start_date), ...tasks.map(t => t.deadline),
    ...relSubs.map(s => s.start_date), ...relSubs.map(s => s.deadline)].sort();

  const gsMs = parseDate(allDates[0]).getTime() - 7 * 86400000;
  const geMs = parseDate(allDates[allDates.length - 1]).getTime() + 21 * 86400000;
  const totalMs = geMs - gsMs;
  const ganttStart = new Date(gsMs);
  const ganttEnd   = new Date(geMs);

  const pct = ds => Math.max(0, Math.min(100, (parseDate(ds) - ganttStart) / totalMs * 100));
  const todayPct = (TODAY - ganttStart) / totalMs * 100;

  const months = [];
  let cur = new Date(ganttStart.getFullYear(), ganttStart.getMonth(), 1);
  while (cur <= ganttEnd) { months.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }

  const LW = 210;

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ minWidth:800 }}>
        <div style={{ display:"flex", marginBottom:6 }}>
          <div style={{ width:LW, flexShrink:0 }} />
          <div style={{ flex:1, position:"relative", height:22 }}>
            {months.map((m, i) => (
              <div key={i} style={{ position:"absolute", left:`${Math.max(0,(m-ganttStart)/totalMs*100)}%`,
                fontSize:9, color:"#94A3B8", fontWeight:700, whiteSpace:"nowrap" }}>
                {m.toLocaleString("default", { month:"short" })} {m.getFullYear()}
              </div>
            ))}
          </div>
        </div>

        {tasks.map((task, ti) => {
          const subs = subTasks.filter(s => s.mt_id === task.id);
          const tc   = getSt(task.status).color;
          const ws   = workspaces.find(w => w.id === task.ws_id);
          return (
            <div key={task.id} style={{ marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", marginBottom:2,
                background: ti % 2 === 0 ? "#F8FAFC" : "white", borderRadius:6, padding:"3px 0", minHeight:38 }}>
                <div style={{ width:LW, flexShrink:0, paddingLeft:8, paddingRight:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:1 }}>
                    {ws && <div style={{ width:8, height:8, borderRadius:2, background:ws.color, flexShrink:0 }} />}
                    <span style={{ fontSize:11, fontWeight:700, color:"#0F172A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{task.title}</span>
                  </div>
                  <div style={{ fontSize:9, color:"#94A3B8", paddingLeft:13 }}>
                    {task.id.toUpperCase()} · <span style={{ color:getPr(task.priority).color }}>{task.priority}</span>
                  </div>
                </div>
                <div style={{ flex:1, position:"relative", height:38 }}>
                  {months.map((m, i) => (
                    <div key={i} style={{ position:"absolute", left:`${Math.max(0,(m-ganttStart)/totalMs*100)}%`, top:0, bottom:0, borderLeft:"1px dashed #E2E8F0" }} />
                  ))}
                  <div style={{ position:"absolute", left:`${todayPct}%`, top:0, bottom:0, borderLeft:"2px solid #F59E0B", zIndex:4 }} />
                  <div style={{ position:"absolute",
                    left:`${pct(task.start_date)}%`,
                    width:`${Math.max(0.5, pct(task.deadline) - pct(task.start_date))}%`,
                    top:9, height:20, background:tc, borderRadius:5, zIndex:2, opacity:.85,
                    display:"flex", alignItems:"center", paddingLeft:7, overflow:"hidden" }}>
                    <span style={{ fontSize:8, color:"white", fontWeight:700, whiteSpace:"nowrap" }}>
                      {fmtShort(task.start_date)} – {fmtShort(task.deadline)}
                    </span>
                  </div>
                </div>
              </div>
              {subs.map(sub => {
                const sc = getSt(sub.status).color;
                return (
                  <div key={sub.id} style={{ display:"flex", alignItems:"center", marginBottom:2,
                    background:"#FAFAFA", borderRadius:5, padding:"1px 0", minHeight:24 }}>
                    <div style={{ width:LW, flexShrink:0, paddingLeft:22, paddingRight:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:5, height:5, borderRadius:1, background:sc, flexShrink:0 }} />
                        <span style={{ fontSize:10, color:"#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub.title}</span>
                      </div>
                    </div>
                    <div style={{ flex:1, position:"relative", height:24 }}>
                      <div style={{ position:"absolute", left:`${todayPct}%`, top:0, bottom:0, borderLeft:"2px solid #F59E0B55" }} />
                      <div style={{ position:"absolute",
                        left:`${pct(sub.start_date)}%`,
                        width:`${Math.max(0.4, pct(sub.deadline) - pct(sub.start_date))}%`,
                        top:6, height:12, background:sc, borderRadius:3, opacity:.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ display:"flex", gap:16, marginTop:18, flexWrap:"wrap", paddingLeft:8 }}>
          {STATUSES.map(s => (
            <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#64748B" }}>
              <div style={{ width:14, height:9, background:s.color, borderRadius:2 }} />
              {s.label}
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#64748B" }}>
            <div style={{ width:2, height:14, background:"#F59E0B" }} />Today
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════
function DashboardView({ mainTasks, subTasks, workspaces, selectedWs }) {
  const tasks = selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs);
  const subs  = subTasks.filter(s => tasks.find(t => t.id === s.mt_id));

  const delayed  = tasks.filter(t => t.status === "DELAYED" || (t.status !== "COMPLETED" && parseDate(t.deadline) < TODAY));
  const upcoming = tasks.filter(t => t.status !== "COMPLETED" && diffDays(TODAY_STR, t.deadline) >= 0 && diffDays(TODAY_STR, t.deadline) <= 14)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const stCounts = STATUSES.map(s  => ({ ...s,  count: tasks.filter(t => t.status   === s.key).length }));
  const prCounts = PRIORITIES.map(p => ({ ...p, count: tasks.filter(t => t.priority === p.key).length }));
  const maxSt = Math.max(...stCounts.map(s => s.count), 1);
  const maxPr = Math.max(...prCounts.map(p => p.count), 1);

  const kpis = [
    { icon:"📋", label:"Total Tasks",    value:tasks.length,                                   color:"#3B82F6" },
    { icon:"✅", label:"Completed",      value:tasks.filter(t => t.status === "COMPLETED").length, color:"#10B981" },
    { icon:"🔄", label:"In Progress",    value:tasks.filter(t => t.status === "IN_PROGRESS").length, color:"#3B82F6" },
    { icon:"🚨", label:"Delayed",        value:delayed.length,                                 color:"#EF4444" },
    { icon:"📌", label:"Total Subtasks", value:subs.length,                                    color:"#A855F7" },
    { icon:"✓",  label:"Subs Completed", value:subs.filter(s => s.status === "COMPLETED").length, color:"#10B981" },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background:"white", borderRadius:12, padding:"16px 18px",
            boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #F1F5F9", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginTop:3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #F1F5F9" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:16 }}>📊 Status Breakdown</div>
          {stCounts.map(s => (
            <div key={s.key} style={{ marginBottom:9 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, fontWeight:600, color:"#475569" }}>{s.label}</span>
                <span style={{ fontSize:11, fontWeight:800, color:s.color }}>{s.count}</span>
              </div>
              <div style={{ height:5, background:"#F1F5F9", borderRadius:3 }}>
                <div style={{ height:5, background:s.color, borderRadius:3, width:`${s.count / maxSt * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #F1F5F9" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:16 }}>🎯 Priority Breakdown</div>
          {prCounts.map(p => (
            <div key={p.key} style={{ marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              <Pill color={p.color} bg={p.bg}>{p.label}</Pill>
              <div style={{ flex:1, height:5, background:"#F1F5F9", borderRadius:3 }}>
                <div style={{ height:5, background:p.color, borderRadius:3, width:`${p.count / maxPr * 100}%` }} />
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:p.color, minWidth:14 }}>{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)",
          border:"1px solid #F1F5F9", borderTop:"3px solid #EF4444" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>🚨 Overdue ({delayed.length})</div>
          {delayed.length === 0 && <div style={{ color:"#10B981", fontSize:12, fontWeight:600 }}>All on track ✓</div>}
          {delayed.map(t => {
            const days = Math.abs(diffDays(t.deadline, TODAY_STR));
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #FEF2F2" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#94A3B8", minWidth:36 }}>{t.id.toUpperCase()}</span>
                <span style={{ fontSize:11, fontWeight:600, color:"#0F172A", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</span>
                <Pill color="#EF4444" bg="#FEF2F2">+{days}d</Pill>
              </div>
            );
          })}
        </div>

        <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)",
          border:"1px solid #F1F5F9", borderTop:"3px solid #F59E0B" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>📅 Upcoming 14 days</div>
          {upcoming.length === 0 && <div style={{ color:"#94A3B8", fontSize:12 }}>No upcoming deadlines.</div>}
          {upcoming.map(t => {
            const days = diffDays(TODAY_STR, t.deadline);
            const ws   = workspaces.find(w => w.id === t.ws_id);
            return (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #FFFBEB" }}>
                {ws && <div style={{ width:7, height:7, borderRadius:"50%", background:ws.color, flexShrink:0 }} />}
                <span style={{ fontSize:11, fontWeight:600, color:"#0F172A", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</span>
                <Pill color={days <= 3 ? "#EF4444" : days <= 7 ? "#F59E0B" : "#10B981"}
                  bg={days <= 3 ? "#FEF2F2" : days <= 7 ? "#FFFBEB" : "#F0FDF4"}>
                  {days === 0 ? "Today" : `${days}d`}
                </Pill>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORY VIEW
// ═══════════════════════════════════════════════════════════
function HistoryView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/history?limit=200").then(data => { setLogs(data); setLoading(false); });
  }, []);

  const actionColor = a => ({ CREATE:"#10B981", UPDATE:"#3B82F6", DELETE:"#EF4444" }[a] || "#64748B");
  const actionBg    = a => ({ CREATE:"#F0FDF4", UPDATE:"#EFF6FF", DELETE:"#FEF2F2" }[a] || "#F8FAFC");
  const tableLabel  = t => ({ main_tasks:"Main Task", sub_tasks:"Sub Task", workspaces:"Workspace" }[t] || t);

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#94A3B8" }}>Loading history…</div>;

  return (
    <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #F1F5F9" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:16 }}>🕐 Change History ({logs.length} records)</div>
      {logs.length === 0 && <div style={{ color:"#94A3B8", fontSize:12 }}>No history yet.</div>}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"2px solid #F1F5F9" }}>
              {["Timestamp","Action","Type","Record","Details"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:10, fontWeight:700, color:"#94A3B8", whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} style={{ borderBottom:"1px solid #F8FAFC", background: i % 2 === 0 ? "#FAFAFA" : "white" }}>
                <td style={{ padding:"8px 10px", color:"#64748B", whiteSpace:"nowrap", fontSize:11 }}>{fmtDateTime(log.timestamp)}</td>
                <td style={{ padding:"8px 10px" }}>
                  <Pill color={actionColor(log.action)} bg={actionBg(log.action)}>{log.action}</Pill>
                </td>
                <td style={{ padding:"8px 10px", color:"#64748B" }}>{tableLabel(log.table_name)}</td>
                <td style={{ padding:"8px 10px", fontWeight:600, color:"#0F172A" }}>{log.record_title || log.record_id}</td>
                <td style={{ padding:"8px 10px", color:"#94A3B8", fontSize:10 }}>
                  {log.action === "UPDATE" && log.old_data && log.new_data && (() => {
                    try {
                      const o = JSON.parse(log.old_data), n = JSON.parse(log.new_data);
                      const changes = [];
                      if (o.status   !== n.status)   changes.push(`Status: ${o.status} → ${n.status}`);
                      if (o.priority !== n.priority) changes.push(`Priority: ${o.priority} → ${n.priority}`);
                      if (o.title    !== n.title)    changes.push(`Title changed`);
                      if (o.deadline !== n.deadline) changes.push(`Deadline: ${o.deadline} → ${n.deadline}`);
                      return changes.join(" | ") || "Updated";
                    } catch { return "Updated"; }
                  })()}
                  {log.action === "CREATE" && "New record created"}
                  {log.action === "DELETE" && "Record deleted"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [workspaces, setWorkspaces] = useState([]);
  const [mainTasks,  setMainTasks]  = useState([]);
  const [subTasks,   setSubTasks]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedWs, setSelectedWs] = useState("ALL");
  const [view,       setView]       = useState("kanban");
  const [modal,      setModal]      = useState(null);
  const [editTask,   setEditTask]   = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ws, mt, st] = await Promise.all([
        api.get("/api/workspaces"),
        api.get("/api/tasks"),
        api.get("/api/subtasks"),
      ]);
      setWorkspaces(ws);
      setMainTasks(mt);
      setSubTasks(st);
      if (ws.length > 0 && selectedWs === "ALL") setSelectedWs(ws[0].id);
    } catch (e) { console.error("Fetch error:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMainTask = async form => {
    const task = await api.post("/api/tasks", { wsId:form.wsId, title:form.title, status:form.status, priority:form.priority, startDate:form.startDate, deadline:form.deadline, notes:form.notes });
    setMainTasks(prev => [...prev, task]);
    setModal(null);
  };

  const addSubTask = async (form, forceMtId) => {
    const mtId = forceMtId || form.mtId;
    if (!mtId) return;
    const sub = await api.post("/api/subtasks", { mtId, title:form.title, status:form.status, priority:form.priority, startDate:form.startDate, deadline:form.deadline });
    setSubTasks(prev => [...prev, sub]);
    setModal(null);
  };

  const changeStatus = async (taskId, newStatus) => {
    const updated = await api.put(`/api/tasks/${taskId}`, { status: newStatus });
    setMainTasks(prev => prev.map(t => t.id === taskId ? updated : t));
  };

  const saveEdit = async form => {
    const updated = await api.put(`/api/tasks/${editTask.id}`, { title:form.title, status:form.status, priority:form.priority, startDate:form.startDate, deadline:form.deadline, notes:form.notes });
    setMainTasks(prev => prev.map(t => t.id === editTask.id ? updated : t));
    setEditTask(null);
  };

  const deleteTask = async id => {
    if (!window.confirm("Delete this task and all its subtasks?")) return;
    await api.delete(`/api/tasks/${id}`);
    setMainTasks(prev => prev.filter(t => t.id !== id));
    setSubTasks(prev => prev.filter(s => s.mt_id !== id));
  };

  const addWorkspace = async ws => {
    const created = await api.post("/api/workspaces", ws);
    setWorkspaces(prev => [...prev, created]);
    setModal(null);
  };

  const VIEWS = [
    { key:"kanban",    label:"Kanban",    icon:"🗂️" },
    { key:"gantt",     label:"Gantt",     icon:"📅" },
    { key:"dashboard", label:"Dashboard", icon:"📊" },
    { key:"history",   label:"History",   icon:"🕐" },
  ];

  const currentWs  = workspaces.find(w => w.id === selectedWs);
  const wsHasAlert = ws => mainTasks.some(t => t.ws_id === ws.id && (t.status === "DELAYED" || (t.status !== "COMPLETED" && parseDate(t.deadline) < TODAY)));

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F1F5F9", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:28 }}>⚡</div>
      <div style={{ fontWeight:700, fontSize:14, color:"#0F172A" }}>TaskFlow</div>
      <div style={{ fontSize:12, color:"#94A3B8" }}>Loading your workspace…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:"#F1F5F9", fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{ width:220, background:"#0F172A", display:"flex", flexDirection:"column", flexShrink:0, boxShadow:"2px 0 8px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid #1E293B" }}>
          <div style={{ fontWeight:900, fontSize:16, letterSpacing:-1 }}>
            <span style={{ color:"white" }}>TASK</span>
            <span style={{ color:"#F59E0B" }}>FLOW</span>
          </div>
          <div style={{ fontSize:8, color:"#475569", fontWeight:700, letterSpacing:1.5, marginTop:1 }}>PROJECT TRACKER PRO</div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#475569", letterSpacing:1.5, padding:"4px 16px 8px" }}>WORKSPACES</div>

          <button onClick={() => setSelectedWs("ALL")}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 16px 9px 13px",
              background: selectedWs === "ALL" ? "#1E293B" : "transparent", border:"none", cursor:"pointer", textAlign:"left",
              borderLeft: selectedWs === "ALL" ? "3px solid #F59E0B" : "3px solid transparent" }}>
            <div style={{ width:26, height:26, borderRadius:7, background:"#334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🌐</div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color: selectedWs === "ALL" ? "white" : "#94A3B8" }}>All Workspaces</div>
              <div style={{ fontSize:9, color:"#475569" }}>{mainTasks.length} tasks</div>
            </div>
          </button>

          {workspaces.map(ws => {
            const active = selectedWs === ws.id;
            return (
              <button key={ws.id} onClick={() => setSelectedWs(ws.id)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 16px 9px 13px",
                  background: active ? "#1E293B" : "transparent", border:"none", cursor:"pointer", textAlign:"left",
                  borderLeft: active ? `3px solid ${ws.color}` : "3px solid transparent" }}>
                <div style={{ width:26, height:26, borderRadius:7, background:ws.color+"28", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                  {ws.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: active ? "white" : "#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ws.name}</div>
                  <div style={{ fontSize:9, color:"#475569" }}>{mainTasks.filter(t => t.ws_id === ws.id).length} tasks</div>
                </div>
                {wsHasAlert(ws) && <div style={{ width:7, height:7, borderRadius:"50%", background:"#EF4444", flexShrink:0 }} />}
              </button>
            );
          })}
        </div>

        <div style={{ padding:"10px 14px 14px", borderTop:"1px solid #1E293B" }}>
          <button onClick={() => setModal({ type:"workspace" })}
            style={{ width:"100%", padding:"8px", borderRadius:8, border:"1.5px dashed #334155",
              background:"transparent", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"center" }}>
            + New Workspace
          </button>
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Top bar */}
        <div style={{ background:"white", borderBottom:"1px solid #E2E8F0", padding:"0 24px",
          display:"flex", alignItems:"center", gap:14, height:55, flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>

          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            {currentWs
              ? <><div style={{ width:8, height:8, borderRadius:"50%", background:currentWs.color }} /><span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{currentWs.name}</span></>
              : <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>All Workspaces</span>}
          </div>

          <div style={{ display:"flex", gap:6 }}>
            {[
              { v: (selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs)).filter(t => t.status === "DELAYED").length, c:"#EF4444", l:"Delayed" },
              { v: (selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs)).filter(t => t.status === "IN_PROGRESS").length, c:"#3B82F6", l:"In Progress" },
              { v: (selectedWs === "ALL" ? mainTasks : mainTasks.filter(t => t.ws_id === selectedWs)).filter(t => t.status === "COMPLETED").length, c:"#10B981", l:"Done" },
            ].filter(s => s.v > 0).map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, background:s.c+"11", border:`1px solid ${s.c}33` }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:s.c }} />
                <span style={{ fontSize:10, fontWeight:700, color:s.c }}>{s.v} {s.l}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:2, background:"#F1F5F9", borderRadius:9, padding:3, marginLeft:"auto" }}>
            {VIEWS.map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{ padding:"6px 12px", borderRadius:7, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:4,
                  background: view === v.key ? "white" : "transparent",
                  color: view === v.key ? "#0F172A" : "#94A3B8",
                  boxShadow: view === v.key ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setModal({ type:"sub", wsId: selectedWs === "ALL" ? workspaces[0]?.id : selectedWs })}
              style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid #E2E8F0", background:"white", color:"#64748B", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              + Sub Task
            </button>
            <button onClick={() => setModal({ type:"main", wsId: selectedWs === "ALL" ? workspaces[0]?.id : selectedWs })}
              style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#0F172A", color:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              + Task
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {view === "kanban"    && <KanbanView mainTasks={mainTasks} subTasks={subTasks} selectedWs={selectedWs} onStatusChange={changeStatus} onAddSub={mtId => setModal({ type:"sub", mtId })} onEdit={task => setEditTask(task)} onDelete={deleteTask} />}
          {view === "gantt"     && <GanttView  mainTasks={mainTasks} subTasks={subTasks} workspaces={workspaces} selectedWs={selectedWs} />}
          {view === "dashboard" && <DashboardView mainTasks={mainTasks} subTasks={subTasks} workspaces={workspaces} selectedWs={selectedWs} />}
          {view === "history"   && <HistoryView />}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "main" && (
        <TaskModal mode="main" wsId={modal.wsId} workspaces={workspaces} mainTasks={mainTasks}
          onSave={addMainTask} onClose={() => setModal(null)} />
      )}
      {modal?.type === "sub" && (
        <TaskModal mode="sub" mtId={modal.mtId} wsId={modal.wsId} workspaces={workspaces} mainTasks={mainTasks}
          onSave={form => addSubTask(form, modal.mtId)} onClose={() => setModal(null)} />
      )}
      {modal?.type === "workspace" && (
        <WorkspaceModal onSave={addWorkspace} onClose={() => setModal(null)} />
      )}
      {editTask && (
        <TaskModal mode="main" editData={editTask} workspaces={workspaces} mainTasks={mainTasks}
          onSave={saveEdit} onClose={() => setEditTask(null)} />
      )}
    </div>
  );
}
