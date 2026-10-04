import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import db, { seed } from "./db.js";

seed();
const app = express();
const SECRET = process.env.JWT_SECRET || "dev-secret";
app.use(cors());
app.use(express.json());

// ---------- Auth ----------
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(String(email || "").toLowerCase().trim());
  if (!u || !bcrypt.compareSync(String(password || ""), u.password))
    return res.status(401).json({ error: "Invalid email or password" });
  const token = jwt.sign({ id: u.id }, SECRET, { expiresIn: "8h" });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email } });
});

const auth = (req, res, next) => {
  try {
    const t = (req.headers.authorization || "").replace("Bearer ", "");
    req.user = jwt.verify(t, SECRET);
    next();
  } catch { res.status(401).json({ error: "Please login again" }); }
};
app.get("/api/auth/me", auth, (req, res) =>
  res.json(db.prepare("SELECT id,name,email FROM users WHERE id=?").get(req.user.id)));

// ---------- Generic CRUD with validation ----------
const num = v => (v === "" || v == null ? NaN : Number(v));
const resources = {
  volunteers: {
    fields: ["name", "email", "phone", "role", "status", "joined"],
    required: ["name"], statuses: ["Active", "Pending"], search: ["name", "email", "role"], order: "id DESC",
  },
  donations: {
    fields: ["donor", "email", "amount", "method", "status", "date"],
    required: ["donor", "amount"], statuses: ["Completed", "Pending"], numeric: ["amount"],
    search: ["donor", "email", "method"], order: "date DESC, id DESC",
  },
  campaigns: {
    fields: ["title", "desc", "raised", "goal", "status", "icon", "end"],
    required: ["title", "goal"], statuses: ["Active", "Draft", "Completed"], numeric: ["raised", "goal"],
    search: ["title", "desc"], order: "id DESC",
  },
};

function clean(cfg, body, partial = false) {
  const out = {};
  for (const f of cfg.fields) {
    if (body[f] === undefined) continue;
    out[f] = cfg.numeric?.includes(f) ? num(body[f]) : String(body[f]).trim();
  }
  for (const f of cfg.required) {
    if (partial && out[f] === undefined) continue;
    if (out[f] === undefined || out[f] === "" || Number.isNaN(out[f])) return { error: `${f} is required` };
  }
  for (const f of cfg.numeric || [])
    if (out[f] !== undefined && (Number.isNaN(out[f]) || out[f] < 0)) return { error: `${f} must be a positive number` };
  if (out.status && !cfg.statuses.includes(out.status)) return { error: "Invalid status" };
  if (out.email && out.email !== "—" && !/^\S+@\S+\.\S+$/.test(out.email)) return { error: "Invalid email" };
  return { data: out };
}

for (const [name, cfg] of Object.entries(resources)) {
  const base = `/api/${name}`;
  const q = f => f.map(x => `"${x}"`).join(",");

  app.get(base, auth, (req, res) => {
    const s = String(req.query.q || "").trim();
    const where = s ? "WHERE " + cfg.search.map(f => `"${f}" LIKE @s`).join(" OR ") : "";
    res.json(db.prepare(`SELECT * FROM ${name} ${where} ORDER BY ${cfg.order}`).all(s ? { s: `%${s}%` } : {}));
  });

  app.post(base, auth, (req, res) => {
    const { data, error } = clean(cfg, req.body || {});
    if (error) return res.status(400).json({ error });
    const keys = Object.keys(data);
    const r = db.prepare(`INSERT INTO ${name}(${q(keys)}) VALUES(${keys.map(() => "?").join(",")})`).run(...keys.map(k => data[k]));
    res.status(201).json(db.prepare(`SELECT * FROM ${name} WHERE id=?`).get(r.lastInsertRowid));
  });

  app.put(`${base}/:id`, auth, (req, res) => {
    const { data, error } = clean(cfg, req.body || {}, true);
    if (error) return res.status(400).json({ error });
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: "Nothing to update" });
    const r = db.prepare(`UPDATE ${name} SET ${keys.map(k => `"${k}"=?`).join(",")} WHERE id=?`).run(...keys.map(k => data[k]), req.params.id);
    if (!r.changes) return res.status(404).json({ error: "Not found" });
    res.json(db.prepare(`SELECT * FROM ${name} WHERE id=?`).get(req.params.id));
  });

  app.delete(`${base}/:id`, auth, (req, res) => {
    const r = db.prepare(`DELETE FROM ${name} WHERE id=?`).run(req.params.id);
    r.changes ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  });
}

// ---------- Dashboard stats (computed in SQL) ----------
app.get("/api/stats", auth, (_req, res) => {
  const one = sql => db.prepare(sql).get();
  const monthly = db.prepare(`SELECT CAST(strftime('%m',date) AS INT) m, SUM(amount) total
    FROM donations WHERE status='Completed' AND strftime('%Y',date)=strftime('%Y','now') GROUP BY m`).all();
  res.json({
    volunteers: one("SELECT COUNT(*) total, SUM(status='Active') active, SUM(status='Pending') pending FROM volunteers"),
    donations: one(`SELECT COALESCE(SUM(CASE WHEN status='Completed' THEN amount END),0) raised,
      SUM(status='Completed') completed, COALESCE(SUM(CASE WHEN status='Pending' THEN amount END),0) pending FROM donations`),
    campaigns: one("SELECT COUNT(*) total, SUM(status='Active') active FROM campaigns"),
    monthly,
  });
});

// ---------- Serve built React app (so only ONE server is needed) ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  app.get("/", (_req, res) => res.send("Frontend not built yet. Run: cd client && npm install && npm run build  (or use npm run dev in client)."));
}

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "Server error" }); });
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
