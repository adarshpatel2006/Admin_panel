import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from "chart.js";
import { api } from "./api.js";
import { money, fmtDate, initial, today, downloadCSV, FORMS } from "./utils.js";

Chart.defaults.font.size = 10; Chart.defaults.color = "#9aa69f";
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

export const Status = ({ s }) => (
  <span className={"status " + (s === "Pending" ? "pending" : s === "Draft" ? "draft" : "")}>{s}</span>
);

/* ---------------- Login ---------------- */
export function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@inamigos.org");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try { onLogin(await api.login(email, password)); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="login-wrap"><form className="login" onSubmit={submit}>
      <div className="brand" style={{ padding: 0 }}><div className="logo">i+</div><div><b>inamigos</b><small>FOUNDATION</small></div></div>
      <h2>Admin login</h2><p>Sign in to manage volunteers, donations and campaigns.</p>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus /></div>
      <button className="btn primary" disabled={busy}>{busy ? "Signing in..." : "Sign in →"}</button>
    </form></div>
  );
}

/* ---------------- Modal form (add / edit) ---------------- */
export function RecordModal({ type, record, onClose, onSaved }) {
  const cfg = FORMS[type];
  const [form, setForm] = useState(() => {
    const init = {};
    cfg.fields.forEach(([k, , kind, opts]) => {
      init[k] = record?.[k] ?? (kind === "date" ? today() : kind === "select" ? opts[0] : "");
    });
    return init;
  });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const saved = record ? await api.update(type, record.id, form) : await api.create(type, form);
      onSaved(saved);
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (<>
    <div className="modalback show" onClick={onClose} />
    <div className="modal show">
      <div className="modalhead"><div><span className="kicker">WORKSPACE</span><h2>{record ? "Edit" : "Add"} {cfg.label}</h2></div><button className="close" onClick={onClose}>×</button></div>
      <form onSubmit={submit}>
        {err && <div className="err">{err}</div>}
        <div className="fields">
          {cfg.fields.map(([k, label, kind, opts]) => (
            <div key={k} className={"field " + (["desc", "title"].includes(k) ? "full" : "")}>
              <label>{label}</label>
              {kind === "select"
                ? <select value={form[k]} onChange={e => set(k, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                : <input type={kind} min={kind === "number" ? 0 : undefined} value={form[k]} required={cfg.required.includes(k)} onChange={e => set(k, e.target.value)} />}
            </div>
          ))}
        </div>
        <div className="modalactions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save changes →"}</button>
        </div>
      </form>
    </div>
  </>);
}

/* ---------------- Overview ---------------- */
export function Overview({ go, refreshKey }) {
  const [s, setS] = useState(null), [vols, setVols] = useState([]), [camps, setCamps] = useState([]), [dons, setDons] = useState([]);
  useEffect(() => {
    Promise.all([api.stats(), api.list("volunteers"), api.list("campaigns"), api.list("donations")])
      .then(([a, b, c, d]) => { setS(a); setVols(b); setCamps(c); setDons(d); });
  }, [refreshKey]);
  if (!s) return <div className="loading">Loading dashboard...</div>;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const cur = new Date().getMonth(), idx = Array.from({ length: 6 }, (_, i) => (cur - 5 + i + 12) % 12);
  const vals = idx.map(m => s.monthly.find(x => x.m === m + 1)?.total || 0);
  const activity = [
    ...vols.map(x => ({ d: x.joined, i: "♧", t: x.name + " joined as volunteer", s: x.role })),
    ...dons.map(x => ({ d: x.date, i: "♡", t: x.donor + " donation recorded", s: money(x.amount) })),
    ...camps.map(x => ({ d: x.end, i: "◈", t: x.title + " campaign", s: x.status })),
  ].sort((a, b) => (b.d || "").localeCompare(a.d || "")).slice(0, 5);
  const pct = c => Math.min(100, Math.round((c.raised / c.goal) * 100) || 0);

  return (<>
    <div className="stats">
      <Stat t="Total volunteers" ico="♧" n={s.volunteers.total} f={`↗ ${s.volunteers.active || 0} active`} sub="Community members" />
      <Stat t="Total donations" ico="♡" cls="yellow" n={money(s.donations.raised)} f={`↗ ${s.donations.completed || 0} completed`} sub="Contributions received" />
      <Stat t="Active campaigns" ico="◈" cls="purple" n={s.campaigns.active || 0} sub="Across current initiatives" />
      <Stat t="Pending donations" ico="◷" cls="blue" n={money(s.donations.pending)} sub="Awaiting confirmation" />
    </div>
    <div className="chart-row">
      <div className="panel"><div className="panel-head"><div><div className="ptitle">Donation activity</div><div className="sub">Completed contributions per month</div></div><span className="sub">Last 6 months</span></div>
        <div className="chart"><Line data={{ labels: idx.map(m => months[m]), datasets: [{ data: vals, borderColor: "#31936c", backgroundColor: "rgba(49,147,108,.10)", fill: true, tension: .38, pointRadius: 3, borderWidth: 2 }] }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => money(c.raw) } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => (v >= 1000 ? v / 1000 + "k" : v) } } } }} /></div></div>
      <div className="panel"><div className="panel-head"><div><div className="ptitle">Campaign impact</div><div className="sub">Fundraising progress across campaigns</div></div></div>
        <div className="impact"><div className="impact-ico">🌱</div><div><small>Total recorded donations</small><strong>{money(s.donations.raised)}</strong></div></div>
        {camps.slice(0, 2).map(c => (<div key={c.id}><div className="goal"><span>{c.title}</span><b>{pct(c)}%</b></div><div className="bar"><i style={{ width: pct(c) + "%" }} /></div></div>))}
      </div>
    </div>
    <div className="bottom">
      <div className="panel"><div className="panel-head"><div><div className="ptitle">Recent volunteers</div><div className="sub">People in your community</div></div><button className="link" onClick={() => go("volunteers")}>View all →</button></div>
        <div className="tablewrap"><table><thead><tr><th>VOLUNTEER</th><th>ROLE</th><th>STATUS</th><th>JOINED</th></tr></thead><tbody>
          {vols.slice(0, 4).map(v => (<tr key={v.id}><td><div className="person"><span className="mini">{initial(v.name)}</span>{v.name}</div></td><td>{v.role}</td><td><Status s={v.status} /></td><td>{fmtDate(v.joined)}</td></tr>))}
        </tbody></table></div></div>
      <div className="panel"><div className="panel-head"><div><div className="ptitle">Recent activity</div><div className="sub">Latest workspace updates</div></div></div>
        {activity.map((a, i) => (<div className="activity" key={i}><div className="mark">{a.i}</div><div><b>{a.t}</b><p>{a.s}</p></div><time>{fmtDate(a.d)}</time></div>))}</div>
    </div>
  </>);
}
const Stat = ({ t, ico, cls = "", n, f, sub }) => (
  <div className="stat"><div className="stat-top">{t} <span className={"stat-ico " + cls}>{ico}</span></div><div className="num">{n}</div>
    <div className="foot">{f && <span className="green">{f} · </span>}{sub}</div></div>
);

/* ---------------- Volunteers / Donations table ---------------- */
export function ListPage({ type, refreshKey, onEdit, onDeleted, notify, initialQ = "" }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(initialQ);
  const vol = type === "volunteers";
  useEffect(() => {
    const t = setTimeout(() => api.list(type, q).then(setRows).catch(e => notify(e.message)), 250);
    return () => clearTimeout(t);
  }, [type, q, refreshKey]);
  const del = async r => {
    if (!confirm("Delete this record?")) return;
    try { await api.remove(type, r.id); setRows(x => x.filter(i => i.id !== r.id)); onDeleted(); notify("Record deleted"); }
    catch (e) { notify(e.message); }
  };
  const heads = vol ? ["VOLUNTEER","EMAIL","ROLE","STATUS","JOINED","ACTIONS"] : ["DONOR","EMAIL","AMOUNT","METHOD","STATUS","DATE","ACTIONS"];
  return (
    <div className="panel section"><div className="toolbar">
      <div><div className="toolbar-title">{vol ? "All volunteers" : "Donation records"}</div><div className="meta">{rows?.length ?? "…"} records · Saved in database</div></div>
      <div className="tools"><input className="table-search" placeholder="Search records..." value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" onClick={() => rows && downloadCSV(`inamigos-${type}.csv`, rows)}>↓ Export CSV</button></div></div>
      <div className="tablewrap"><table><thead><tr>{heads.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
        {rows === null ? <tr><td colSpan="7" className="empty">Loading...</td></tr>
          : rows.length === 0 ? <tr><td colSpan="7" className="empty"><b>No records found</b>Add a record or change your search.</td></tr>
          : rows.map(x => (<tr key={x.id}>
            {vol ? <><td><div className="person"><span className="mini">{initial(x.name)}</span>{x.name}</div></td><td>{x.email}</td><td>{x.role}</td><td><Status s={x.status} /></td><td>{fmtDate(x.joined)}</td></>
              : <><td><div className="person">{x.donor}</div></td><td>{x.email}</td><td><b>{money(x.amount)}</b></td><td>{x.method}</td><td><Status s={x.status} /></td><td>{fmtDate(x.date)}</td></>}
            <td><div className="row-actions"><button onClick={() => onEdit(x)}>Edit</button><button onClick={() => del(x)}>Delete</button></div></td></tr>))}
      </tbody></table></div></div>
  );
}

/* ---------------- Campaigns ---------------- */
export function Campaigns({ refreshKey, onEdit, onDeleted, notify, initialQ = "" }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.list("campaigns", initialQ).then(setRows).catch(e => notify(e.message)); }, [refreshKey]);
  if (!rows) return <div className="loading">Loading campaigns...</div>;
  const del = async c => {
    if (!confirm("Delete this campaign?")) return;
    try { await api.remove("campaigns", c.id); setRows(r => r.filter(x => x.id !== c.id)); onDeleted(); notify("Record deleted"); } catch (e) { notify(e.message); }
  };
  return (<>
    <div className="toolbar"><div><div className="toolbar-title">All campaigns</div><div className="meta">{rows.length} initiatives</div></div>
      <button className="btn" onClick={() => downloadCSV("inamigos-campaigns.csv", rows)}>↓ Export CSV</button></div>
    <div className="campaigns">{rows.map((c, i) => (
      <article className="campaign" key={c.id}>
        <div className={"cover " + (i % 3 === 1 ? "c2" : i % 3 === 2 ? "c3" : "")}>{c.icon || "🌱"}<span className={"status " + (c.status === "Draft" ? "draft" : "")}>{c.status}</span></div>
        <div className="cbody"><h3>{c.title}</h3><p>{c.desc}</p>
          <div className="goal"><span>Raised <b>{money(c.raised)}</b></span><b>Goal {money(c.goal)}</b></div>
          <div className="bar"><i style={{ width: Math.min(100, (c.raised / c.goal) * 100) + "%" }} /></div>
          <div className="cfoot"><span>Ends {fmtDate(c.end)}</span><div className="row-actions"><button onClick={() => onEdit(c)}>Edit</button><button onClick={() => del(c)}>Delete</button></div></div></div>
      </article>))}</div>
  </>);
}

/* ---------------- Reports & Settings ---------------- */
export function Reports({ go, notify }) {
  const [s, setS] = useState(null);
  useEffect(() => { api.stats().then(setS); }, []);
  if (!s) return <div className="loading">Loading...</div>;
  const exportAll = async t => { downloadCSV(`inamigos-${t}.csv`, await api.list(t)); notify("CSV export prepared"); };
  return (
    <div className="reports">
      <div className="report"><h3>Volunteer summary</h3><p>{s.volunteers.total} volunteer records, including {s.volunteers.active || 0} active volunteers.</p><button className="btn" onClick={() => go("volunteers")}>View volunteers →</button> <button className="btn" onClick={() => exportAll("volunteers")}>CSV ↓</button></div>
      <div className="report"><h3>Donation summary</h3><p>{s.donations.completed || 0} completed donations totalling {money(s.donations.raised)}; {money(s.donations.pending)} pending.</p><button className="btn" onClick={() => go("donations")}>View donations →</button> <button className="btn" onClick={() => exportAll("donations")}>CSV ↓</button></div>
      <div className="report"><h3>Campaign summary</h3><p>{s.campaigns.active || 0} active campaigns out of {s.campaigns.total} listed initiatives.</p><button className="btn" onClick={() => go("campaigns")}>View campaigns →</button> <button className="btn" onClick={() => exportAll("campaigns")}>CSV ↓</button></div>
    </div>
  );
}

export function Settings({ user }) {
  return (
    <div className="settings">
      <div className="panel"><div className="ptitle">Workspace profile</div>
        <div className="settingrow">Organization name <small>InAmigos Foundation</small></div>
        <div className="settingrow">Logged in as <small>{user.name} · {user.email}</small></div>
        <div className="settingrow">Data storage <small>SQLite database on the server (server/inamigos.db)</small></div></div>
      <div className="panel"><div className="ptitle">Security</div>
        <div className="settingrow">Authentication <small>JWT login, 8-hour session, passwords hashed with bcrypt</small></div>
        <div className="settingrow">Validation <small>All inputs are validated on the server</small></div></div>
    </div>
  );
}
