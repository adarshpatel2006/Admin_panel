export const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
export const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const initial = n => String(n || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
export const today = () => new Date().toISOString().slice(0, 10);

export function downloadCSV(name, rows) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const csv = [cols.join(","), ...rows.map(o => cols.map(k => '"' + String(o[k] ?? "").replace(/"/g, '""') + '"').join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export const FORMS = {
  volunteers: { label: "volunteer", fields: [["name","Full name","text"],["email","Email address","email"],["phone","Phone number","text"],["role","Volunteer role","text"],["status","Status","select",["Active","Pending"]],["joined","Joined date","date"]], required: ["name"] },
  donations: { label: "donation", fields: [["donor","Donor name","text"],["email","Email address","email"],["amount","Amount (INR)","number"],["method","Payment method","select",["UPI","Bank Transfer","Card","Cash"]],["status","Status","select",["Completed","Pending"]],["date","Donation date","date"]], required: ["donor","amount"] },
  campaigns: { label: "campaign", fields: [["title","Campaign title","text"],["desc","Description","text"],["raised","Amount raised (INR)","number"],["goal","Target goal (INR)","number"],["status","Status","select",["Active","Draft","Completed"]],["end","End date","date"],["icon","Card emoji","text"]], required: ["title","goal"] },
};
