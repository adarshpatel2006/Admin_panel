import { useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api.js";
import { Login, Overview, ListPage, Campaigns, Reports, Settings, RecordModal } from "./components.jsx";
import { initial, money } from "./utils.js";

const TITLES = {
  overview: ["Good afternoon, Admin ✦", "Here’s what’s happening with your organization today."],
  volunteers: ["Volunteer management", "Build and support the people powering your impact."],
  donations: ["Donation overview", "Track contributions and keep every record organized."],
  campaigns: ["Campaign management", "Create initiatives and follow their progress."],
  reports: ["Reports & insights", "A snapshot of your workspace activity."],
  settings: ["Workspace settings", "Manage your workspace preferences."],
};
const ADD = { overview: ["volunteers", "＋  Add volunteer"], volunteers: ["volunteers", "＋  Add volunteer"], donations: ["donations", "＋  Record donation"], campaigns: ["campaigns", "＋  New campaign"] };

export default function App() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const [page, setPage] = useState("overview"), [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null), [key, setKey] = useState(0), [toast, setToast] = useState("");
  const [vcount, setVcount] = useState(0), [pending, setPending] = useState({ v: 0, d: 0 });
  const [bell, setBell] = useState(false), [guide, setGuide] = useState(false), [gq, setGq] = useState(""), [filter, setFilter] = useState("");

  const notify = useCallback(m => { setToast(m); setTimeout(() => setToast(""), 2200); }, []);
  const refresh = useCallback(() => setKey(k => k + 1), []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    if (getToken()) api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
    else setReady(true);
    window.addEventListener("logout", logout);
    return () => window.removeEventListener("logout", logout);
  }, [logout]);
  useEffect(() => { if (user) api.stats().then(s => { setVcount(s.volunteers.total); setPending({ v: s.volunteers.pending || 0, d: s.donations.pending || 0 }); }).catch(() => {}); }, [user, key]);

  if (!ready) return <div className="loading">Loading...</div>;
  if (!user) return <Login onLogin={d => { setToken(d.token); setUser(d.user); }} />;

  const go = p => { setPage(p); setOpen(false); setBell(false); if (p !== page) setFilter(""); };
  const globalSearch = async e => {
    e.preventDefault(); const q = gq.trim(); if (!q) return;
    for (const t of ["volunteers", "donations", "campaigns"]) {
      const r = await api.list(t, q).catch(() => []);
      if (r.length) { setPage(t); setFilter(q); setKey(k => k + 1); return; }
    }
    notify("No results found for \"" + q + "\"");
  };
  const nav = (p, ico, label, count) => (
    <button className={page === p ? "active" : ""} onClick={() => go(p)}><span className="nav-ico">{ico}</span>{label}{count != null && <span className="count">{count}</span>}</button>
  );
  const common = { refreshKey: key, notify, onDeleted: refresh };
  const add = ADD[page];

  return (<>
    <div className="shell">
      <aside className={"side " + (open ? "open" : "")}>
        <div className="brand"><div className="logo">i+</div><div><b>inamigos</b><small>FOUNDATION</small></div></div>
        <div className="workspace"><div className="ws-icon">IF</div><div><b>InAmigos Foundation</b><small>Organization workspace</small></div></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav">{nav("overview", "▦", "Overview")}{nav("volunteers", "♧", "Volunteers", vcount)}{nav("donations", "♡", "Donations")}{nav("campaigns", "◈", "Campaigns")}</nav>
        <div className="nav-label gap">MANAGE</div>
        <nav className="nav">{nav("reports", "▤", "Reports")}{nav("settings", "⚙", "Settings")}</nav>
        <div className="side-bottom"><div className="help"><div className="spark">✦</div><b>Need a hand?</b><p>Manage your community and keep your impact growing.</p><button onClick={() => setGuide(true)}>View quick guide ↗</button></div><div className="profile"><div className="avatar">{initial(user.name)}</div><div><b>{user.name}</b><small>Workspace admin</small></div><button className="link" onClick={logout}>Logout</button></div></div>
      </aside>
      <main className="main">
        <header className="top"><button className="menu" id="menu" onClick={() => setOpen(o => !o)}>☰</button>
          <div className="crumb">Workspace <span style={{ margin: "0 9px", color: "#c0c9c3" }}>/</span><b style={{ textTransform: "capitalize" }}>{page}</b></div>
          <div className="actions"><form onSubmit={globalSearch}><input className="search" placeholder="⌕  Search anything..." value={gq} onChange={e => setGq(e.target.value)} /></form>
            <div style={{ position: "relative" }}><button className="link" style={{ fontSize: 18 }} title="Notifications" onClick={() => setBell(b => !b)}>🔔{pending.v + (pending.d ? 1 : 0) > 0 && <span className="badge">{pending.v + (pending.d ? 1 : 0)}</span>}</button>
              {bell && <div className="dropdown"><b>Notifications</b>
                {pending.v + pending.d === 0 ? <p>You're all caught up ✓</p> : <>
                  {pending.v > 0 && <button onClick={() => go("volunteers")}>♧ {pending.v} volunteer(s) pending approval</button>}
                  {pending.d > 0 && <button onClick={() => go("donations")}>♡ {money(pending.d)} in donations awaiting confirmation</button>}</>}</div>}</div>
            <div className="avatar">{initial(user.name)}</div></div></header>
        <section className="content">
          <div className="heading"><div><div className="eyebrow"><span className="dot" /> ORGANIZATION OVERVIEW</div><h1>{TITLES[page][0]}</h1><p>{TITLES[page][1]}</p></div>
            {add && <div className="heading-btns"><button className="btn primary" onClick={() => setModal({ type: add[0] })}>{add[1]}</button></div>}</div>
          {page === "overview" && <Overview go={go} refreshKey={key} />}
          {(page === "volunteers" || page === "donations") && <ListPage key={page + filter} type={page} initialQ={filter} {...common} onEdit={r => setModal({ type: page, record: r })} />}
          {page === "campaigns" && <Campaigns key={filter} initialQ={filter} {...common} onEdit={r => setModal({ type: "campaigns", record: r })} />}
          {page === "reports" && <Reports go={go} notify={notify} />}
          {page === "settings" && <Settings user={user} />}
          <footer>© 2026 InAmigos Foundation · Admin workspace <span>Made for meaningful impact <b>♥</b></span></footer>
        </section>
      </main>
    </div>
    {modal && <RecordModal {...modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); notify("Record saved successfully"); }} />}
    {guide && <><div className="modalback show" onClick={() => setGuide(false)} /><div className="modal show"><div className="modalhead"><div><span className="kicker">HELP</span><h2>Quick guide</h2></div><button className="close" onClick={() => setGuide(false)}>×</button></div>
      <ol style={{ lineHeight: 1.9, paddingLeft: 18, fontSize: 12 }}><li>Use the left menu to open each section.</li><li>Add, edit or delete records — they are saved in the database.</li><li>Use the top search bar to find any record quickly.</li><li>Export any list as CSV.</li><li>The 🔔 bell shows items waiting for your attention.</li></ol></div></>}
    <div className={"toast " + (toast ? "show" : "")}>{toast}</div>
  </>);
}
