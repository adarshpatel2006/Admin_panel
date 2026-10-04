import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import path from "path";

const dbPath = fileURLToPath(new URL("./inamigos.db", import.meta.url));
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS volunteers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT,
  role TEXT, status TEXT DEFAULT 'Active', joined TEXT);
CREATE TABLE IF NOT EXISTS donations(
  id INTEGER PRIMARY KEY AUTOINCREMENT, donor TEXT NOT NULL, email TEXT,
  amount REAL NOT NULL, method TEXT DEFAULT 'UPI', status TEXT DEFAULT 'Completed', date TEXT);
CREATE TABLE IF NOT EXISTS campaigns(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, desc TEXT,
  raised REAL DEFAULT 0, goal REAL NOT NULL, status TEXT DEFAULT 'Active', icon TEXT, end TEXT);
`);

export function seed() {
  const email = process.env.ADMIN_EMAIL || "admin@inamigos.org";
  if (!db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) {
    db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)")
      .run("Admin Profile", email, bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10));
  }
  if (db.prepare("SELECT COUNT(*) c FROM volunteers").get().c) return;
  const v = db.prepare("INSERT INTO volunteers(name,email,phone,role,status,joined) VALUES(?,?,?,?,?,?)");
  [["Aarav Sharma","aarav@example.com","+91 98765 43210","Community Outreach","Active","2026-09-12"],
   ["Meera Joshi","meera@example.com","+91 98231 45670","Fundraising","Active","2026-09-18"],
   ["Rohan Patel","rohan@example.com","+91 98980 12345","Content & Media","Pending","2026-09-25"],
   ["Sara Khan","sara@example.com","+91 97654 32109","Event Support","Active","2026-09-28"]].forEach(r => v.run(...r));
  const d = db.prepare("INSERT INTO donations(donor,email,amount,method,status,date) VALUES(?,?,?,?,?,?)");
  [["Ananya Verma","ananya@example.com",3001,"UPI","Completed","2026-10-01"],
   ["Rahul Mehta","rahul@example.com",2500,"Bank Transfer","Completed","2026-10-02"],
   ["Anonymous","—",1000,"UPI","Pending","2026-10-03"],
   ["Priya Shah","priya@example.com",7500,"Card","Completed","2026-10-03"],
   ["Kabir Singh","kabir@example.com",3000,"UPI","Completed","2026-05-14"],
   ["Neha Gupta","neha@example.com",4500,"Card","Completed","2026-06-09"],
   ["Vikram Rao","vikram@example.com",6000,"Bank Transfer","Completed","2026-07-21"],
   ["Isha Malhotra","isha@example.com",2000,"UPI","Completed","2026-08-11"],
   ["Arjun Nair","arjun@example.com",8500,"UPI","Completed","2026-09-05"]].forEach(r => d.run(...r));
  const c = db.prepare("INSERT INTO campaigns(title,desc,raised,goal,status,icon,end) VALUES(?,?,?,?,?,?,?)");
  [["Education for Every Child","Help provide learning resources and brighter opportunities.",78000,100000,"Active","📚","2026-11-30"],
   ["Community Care Drive","Support essential supplies for families in need.",42000,80000,"Active","🤝","2026-11-15"],
   ["Green Neighbourhood","Build cleaner, greener and healthier communities.",18500,50000,"Draft","🌱","2026-12-20"]].forEach(r => c.run(...r));
}
export default db;
