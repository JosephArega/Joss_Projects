# Local Setup Guide — Windows + PostgreSQL

This guide walks you through running the Task Management & Asset Tracking System
on a local Windows PC with your existing PostgreSQL install. Every step here was
validated end-to-end (backend boots, all tables auto-create, admin seeded, login
returns a JWT) against PostgreSQL 16.

> The app builds its schema automatically from the SQLAlchemy models
> (`db.create_all()`) and seeds a `superadmin` user on first run. You do **not**
> need to import any `.sql` dump just to run it. Import a dump only if you want to
> restore existing data (see the last section).

## Prerequisites

- **Python 3.8+** (3.11 recommended) — https://www.python.org/downloads/ (tick "Add python.exe to PATH")
- **Node.js 16+** (18/20/22 fine) — https://nodejs.org/
- **PostgreSQL** (already installed) — you know your `postgres` superuser password

Open **two** terminals (PowerShell). Terminal A = backend, Terminal B = frontend.

## 1. Create the database

In PowerShell (adjust the path/version if different):

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres
```

Then in the `psql` prompt:

```sql
CREATE USER taskuser WITH PASSWORD 'taskpass';
CREATE DATABASE task_management OWNER taskuser;
\q
```

## 2. Backend (Terminal A)

```powershell
cd "C:\Users\hp\Documents\JOSS File\task_system\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`requirements.txt` already includes `psycopg2-binary`, so PostgreSQL works out of the box.

Point the app at PostgreSQL by editing `backend\.env` so `DATABASE_URL` reads:

```
SECRET_KEY=change-me-to-a-long-random-string
JWT_SECRET_KEY=change-me-to-another-long-random-string
DATABASE_URL=postgresql://taskuser:taskpass@localhost:5432/task_management
FLASK_ENV=development
```

Start it:

```powershell
python app.py
```

You should see `Super Admin created ...` on first run and the server on
**http://localhost:5000**. Sanity check in a browser: http://localhost:5000/api/health

## 3. Frontend (Terminal B)

```powershell
cd "C:\Users\hp\Documents\JOSS File\task_system\frontend"
npm install
npm start
```

This opens **http://localhost:3000**. The frontend talks to the backend via
`REACT_APP_API_URL=http://localhost:5000/api` (already set in `frontend\.env`).

## 4. Log in

- **Username:** `superadmin`
- **Password:** `SuperAdmin123!`

Change this password after first login.

## Restoring an existing database dump (optional)

Only needed if you want to load data from your `DB_Dump` / `.sql` files rather
than start empty.

**Important — schema first:** let the backend start once so `db.create_all()`
builds the tables, OR make sure your dump itself creates them.

### Plain-SQL dump (`.sql`)

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U taskuser -d task_management -f "C:\Users\hp\Documents\JOSS File\task_system\DB_Dump\your_dump.sql"
```

### Custom-format dump (`.dump` / `.backup`, made with `pg_dump -Fc`)

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\pg_restore.exe' -U taskuser -d task_management --no-owner "C:\Users\hp\Documents\JOSS File\task_system\DB_Dump\your_dump.backup"
```

Add `--clean --if-exists` if you need to overwrite existing tables. If the dump
was created by a *different* app/schema than these SQLAlchemy models, restore it
into a **separate** database first and reconcile columns before pointing the app at it.

## Migrations

The project pins `Flask-Migrate` in `requirements.txt`. The current `app.py`
uses `db.create_all()` (no migration history), which is fine for local dev. If
you later adopt Alembic migrations:

```powershell
$env:FLASK_APP="app.py"
flask db init
flask db migrate -m "initial"
flask db upgrade
```

## Staying on SQLite instead (zero DB setup)

If you don't want to use PostgreSQL at all, leave `.env` as
`DATABASE_URL=sqlite:///task_management.db` and just run `python app.py`. A
SQLite file is created under `backend\instance\`.

## Troubleshooting

- **`psycopg2` build errors:** ensure `psycopg2-binary` (not `psycopg2`) is what pip installed.
- **`password authentication failed`:** the `DATABASE_URL` password must match the `CREATE USER` password.
- **Port 5000 in use:** change the port in `app.py` (`app.run(... port=5001)`) and update `frontend\.env` to match.
- **CORS / network errors in the UI:** confirm the backend is running and `REACT_APP_API_URL` points to it; restart `npm start` after editing `frontend\.env`.
- **PowerShell blocks `Activate.ps1`:** run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal.
