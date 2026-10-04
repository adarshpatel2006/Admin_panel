# InAmigos Admin Panel — Full-Stack (React + Node/Express + SQLite)

## Sabse aasaan tarika (sirf 1 server)
Node.js 18+ chahiye. Project folder me terminal kholo:
```
cd server
npm install
npm start
```
Phir browser me **http://localhost:3001** kholo (frontend pehle se build karke diya gaya hai).
Login: `admin@inamigos.org` / `admin123`

> Note: `client/index.html` ko double-click se mat kholo — wo React ka khali shell hai.
> Hamesha http://localhost:3001 (ya dev mode me http://localhost:5173) se kholo.

## Frontend me changes karne ho (dev mode)
```
# Terminal 1:  cd server && npm run dev
# Terminal 2:  cd client && npm install && npm run dev     -> http://localhost:5173
```
Changes ke baad production build: `cd client && npm run build`

## Features
Login (JWT + bcrypt) · Volunteers/Donations/Campaigns add-edit-delete · search · global search bar ·
notifications bell (pending items) · quick guide · dashboard stats + chart from DB · CSV export · reports ·
mobile responsive · server-side validation.

## Production se pehle
`server/.env` me JWT_SECRET aur admin password badlo, HTTPS use karo.
